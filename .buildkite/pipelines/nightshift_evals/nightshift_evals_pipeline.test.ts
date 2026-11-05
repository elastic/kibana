/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse as yamlParse } from 'yaml';
import {
  buildNightshiftEvalSteps,
  getNightshiftEvalTriggerStep,
  parseNightshiftSelection,
  parseNightshiftSelectionFromEnv,
  toConnectorId,
} from './nightshift_evals_pipeline.ts';

const TASK_CONFIGS = {
  ki_feature_extraction: {
    timeoutMinutes: 120,
    downloads: [{ src: 'gs://bucket/data', dest: 'snapshots/x', recursive: true }],
    pr: { args: ['--dataset', 'otel-demo'] },
  },
  other_task: {},
};

type Step = Record<string, any>;

const taskSteps = (yaml: string): Step[] => {
  const parsed = yamlParse(yaml) as { steps: Array<{ steps: Step[] }> };
  return parsed.steps[0].steps.filter((step) => step.command?.includes('run_task.sh'));
};

describe('nightshift_evals_pipeline', () => {
  describe('toConnectorId', () => {
    it('matches the id Kibana gives an EIS connector', () => {
      expect(toConnectorId('anthropic-claude-4.6-sonnet')).toBe('anthropic-claude-4-6-sonnet');
      expect(toConnectorId('OpenAI_GPT-5.4')).toBe('openai-gpt-5-4');
    });
  });

  describe('parseNightshiftSelection', () => {
    it('returns null without a task label', () => {
      expect(parseNightshiftSelection('')).toBeNull();
      expect(parseNightshiftSelection('evals:smoke-tests,models:eis/openai-gpt-5.4')).toBeNull();
    });

    it('uses the default model when no eis model label is present', () => {
      expect(parseNightshiftSelection('nightshift-evals:ki_feature_extraction')).toEqual({
        tasks: ['ki_feature_extraction'],
        connectorIds: [''],
      });
    });

    it('maps eis models to connector ids and ignores other model labels', () => {
      jest.spyOn(console, 'error').mockImplementation();
      const labels =
        'nightshift-evals:a,nightshift-evals:b,models:eis/anthropic-claude-4.6-sonnet,' +
        'models:eis/openai-gpt-5.4,models:openrouter/openai-gpt-5.4,models:judge:eis/x';
      expect(parseNightshiftSelection(labels)).toEqual({
        tasks: ['a', 'b'],
        connectorIds: ['anthropic-claude-4-6-sonnet', 'openai-gpt-5-4'],
      });
    });

    it('selects every task for `nightshift-evals:all`', () => {
      expect(parseNightshiftSelection('nightshift-evals:all,nightshift-evals:a')?.tasks).toBe(
        'all'
      );
    });
  });

  describe('parseNightshiftSelectionFromEnv', () => {
    it('reads tasks and model groups from the build env', () => {
      expect(parseNightshiftSelectionFromEnv('a, b', 'eis/openai-gpt-5.4')).toEqual({
        tasks: ['a', 'b'],
        connectorIds: ['openai-gpt-5-4'],
      });
      expect(parseNightshiftSelectionFromEnv('', 'eis/x')).toBeNull();
    });
  });

  describe('getNightshiftEvalTriggerStep', () => {
    it('is null without a task label', () => {
      expect(getNightshiftEvalTriggerStep('evals:smoke-tests')).toBeNull();
    });

    it('does not depend on the Kibana build and is soft-fail', () => {
      const step = yamlParse(
        `steps:\n${getNightshiftEvalTriggerStep('nightshift-evals:a')}`
      ).steps[0];
      expect(step.depends_on).toBeUndefined();
      expect(step.soft_fail).toBe(true);
      expect(step.env.GITHUB_PR_LABELS).toBe('nightshift-evals:a');
    });

    it('drops labels with whitespace before forwarding', () => {
      const step = yamlParse(
        `steps:\n${getNightshiftEvalTriggerStep('nightshift-evals:a,good first issue')}`
      ).steps[0];
      expect(step.env.GITHUB_PR_LABELS).toBe('nightshift-evals:a');
    });
  });

  describe('buildNightshiftEvalSteps', () => {
    const build = (overrides = {}) =>
      buildNightshiftEvalSteps({
        tasks: ['ki_feature_extraction'],
        connectorIds: ['model-a', 'model-b'],
        taskConfigs: TASK_CONFIGS,
        preemptible: false,
        ...overrides,
      });

    it('emits one step per task and model', () => {
      const steps = taskSteps(build());
      expect(steps.map((step) => step.env.NIGHTSHIFT_EVAL_CONNECTOR_ID)).toEqual([
        'model-a',
        'model-b',
      ]);
      expect(steps[0].key).toBe('nightshift-evals-ki_feature_extraction-model-a');
    });

    it('takes args, timeout and downloads from the task config', () => {
      const [pr] = taskSteps(build());
      expect(pr.env.NIGHTSHIFT_EVAL_ARGS).toBe('--dataset otel-demo');
      expect(pr.timeout_in_minutes).toBe(120);
      expect(JSON.parse(pr.env.NIGHTSHIFT_EVAL_DOWNLOADS)).toHaveLength(1);
    });

    it('appends extra args and defaults the timeout', () => {
      const [step] = taskSteps(build({ tasks: ['other_task'], extraArgs: ['--scenario', 's'] }));
      expect(step.env.NIGHTSHIFT_EVAL_ARGS).toBe('--scenario s');
      expect(step.timeout_in_minutes).toBe(90);
    });

    it('names the default model step `default`', () => {
      const [step] = taskSteps(build({ connectorIds: [''] }));
      expect(step.key).toBe('nightshift-evals-ki_feature_extraction-default');
      expect(step.label).toContain('default');
    });

    it('uses preemptible agents only when asked', () => {
      expect(taskSteps(build())[0].agents.preemptible).toBeUndefined();
      expect(taskSteps(build())[0].retry.automatic).toEqual([{ exit_status: '*', limit: 1 }]);
      expect(taskSteps(build({ preemptible: true }))[0].agents.preemptible).toBe(true);
    });

    it('adds the PR comment step after every task step', () => {
      const parsed = yamlParse(build()) as { steps: Array<{ steps: Step[] }> };
      const comment = parsed.steps[0].steps.find((step) => step.key === 'nightshift-evals-pr-comment');
      expect(comment?.depends_on).toEqual([
        'nightshift-evals-ki_feature_extraction-model-a',
        'nightshift-evals-ki_feature_extraction-model-b',
      ]);
      expect(comment?.allow_dependency_failure).toBe(true);
    });

    it('fails for an unknown task', () => {
      expect(() => build({ tasks: ['nope'] })).toThrow('Unknown nightshift-evals task(s): nope');
    });
  });
});
