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
  NIGHTSHIFT_EVAL_LABEL,
  NIGHTSHIFT_EXPERIMENT,
  getNightshiftEvalSteps,
  getNightshiftEvalTriggerStep,
  isPreemptibleEnabled,
} from './nightshift_evals_pipeline.ts';

type Step = Record<string, any>;

const parseSteps = (fragment: string): Step[] =>
  (yamlParse(`steps:\n${fragment}`) as { steps: Step[] }).steps;

const ORIGINAL_ENV = process.env;

describe('nightshift_evals_pipeline', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.EVAL_PREEMPTIBLE;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  describe('getNightshiftEvalTriggerStep', () => {
    it('is null without the start label', () => {
      expect(getNightshiftEvalTriggerStep('')).toBeNull();
      expect(getNightshiftEvalTriggerStep('evals:smoke-tests,models:eis/openai-gpt-5.4')).toBeNull();
    });

    it('matches the label exactly, not as a substring', () => {
      expect(getNightshiftEvalTriggerStep(`${NIGHTSHIFT_EVAL_LABEL}-other`)).toBeNull();
      expect(getNightshiftEvalTriggerStep(`x${NIGHTSHIFT_EVAL_LABEL}`)).toBeNull();
    });

    it('fires for the label among others', () => {
      expect(getNightshiftEvalTriggerStep(`foo, ${NIGHTSHIFT_EVAL_LABEL} ,bar`)).not.toBeNull();
    });

    it('is soft-fail, needs no Kibana build and forwards no labels', () => {
      const [step] = parseSteps(getNightshiftEvalTriggerStep(NIGHTSHIFT_EVAL_LABEL) as string);
      expect(step.soft_fail).toBe(true);
      expect(step.depends_on).toBeUndefined();
      expect(step.env).toBeUndefined();
      expect(step.command).toContain('trigger_pr.sh');
    });
  });

  describe('getNightshiftEvalSteps', () => {
    const build = (preemptible = false) => parseSteps(getNightshiftEvalSteps({ preemptible }));
    const { task, args, downloads, timeoutMinutes } = NIGHTSHIFT_EXPERIMENT;

    it('runs the hardcoded experiment with the default model', () => {
      const [run] = build();
      expect(run.command).toContain('run_task.sh');
      expect(run.env.NIGHTSHIFT_EVAL_TASK).toBe(task);
      expect(run.env.NIGHTSHIFT_EVAL_CONNECTOR_ID).toBe('');
      expect(run.env.NIGHTSHIFT_EVAL_ARGS).toBe(args.join(' '));
      expect(JSON.parse(run.env.NIGHTSHIFT_EVAL_DOWNLOADS)).toEqual(downloads);
      expect(run.timeout_in_minutes).toBe(timeoutMinutes);
      // The EIS key and the Vault config the run needs.
      expect(run.env.KBN_EVALS).toBe('1');
      expect(run.env.FTR_EIS_CCM).toBe('1');
    });

    it('uses preemptible agents only when asked', () => {
      const [plain] = build(false);
      expect(plain.agents.preemptible).toBeUndefined();
      expect(plain.retry.automatic).toEqual([{ exit_status: '*', limit: 1 }]);

      const [spot] = build(true);
      expect(spot.agents.preemptible).toBe(true);
      expect(spot.retry.automatic).toEqual([
        { exit_status: '-1', limit: 3 },
        { exit_status: '*', limit: 1 },
      ]);
    });

    it('posts the PR comment after the run, even when it failed', () => {
      const [run, comment] = build();
      expect(comment.command).toContain('post_pr_comment.sh');
      expect(comment.depends_on).toBe(run.key);
      expect(comment.allow_dependency_failure).toBe(true);
      expect(comment.env.NIGHTSHIFT_EVAL_TASKS).toBe(task);
    });
  });

  describe('isPreemptibleEnabled', () => {
    it.each([
      [undefined, true],
      ['1', true],
      ['0', false],
      ['false', false],
      [' No ', false],
    ])('EVAL_PREEMPTIBLE=%p -> %p', (value, expected) => {
      if (value === undefined) {
        delete process.env.EVAL_PREEMPTIBLE;
      } else {
        process.env.EVAL_PREEMPTIBLE = value;
      }
      expect(isPreemptibleEnabled()).toBe(expected);
    });
  });
});
