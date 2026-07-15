/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse as yamlParse } from 'yaml';
import { getEvalPipeline, getEvalTriggerStep, shouldRunEvals } from './eval_pipeline';

// `jest.mock` calls are hoisted above the imports above, so `eval_pipeline` sees
// the mocked `fs` / `child_process` when it is first evaluated.
jest.mock('fs', () => ({ readFileSync: jest.fn() }));
jest.mock('child_process', () => ({ execFileSync: jest.fn() }));

const { readFileSync } = jest.requireMock('fs') as { readFileSync: jest.Mock };
const { execFileSync } = jest.requireMock('child_process') as { execFileSync: jest.Mock };

const SUITES = {
  suites: [
    {
      id: 'agent-builder',
      name: 'Agent Builder',
      ciLabels: ['evals:agent-builder'],
      configPath: 'x-pack/agent-builder/playwright.config.ts',
    },
    {
      id: 'smoke-tests',
      name: 'Smoke Tests',
      ciLabels: ['evals:smoke-tests'],
      configPath: 'x-pack/smoke-tests/playwright.config.ts',
      defaultModelGroups: ['eis/anthropic-claude-4.5-haiku'],
    },
  ],
};

const ORIGINAL_ENV = process.env;

const parseStep = (fragment: string): Record<string, any> => {
  const parsed = yamlParse(`steps:\n${fragment}`) as { steps: Array<Record<string, any>> };
  return parsed.steps[0];
};

describe('eval_pipeline', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.EVAL_PREEMPTIBLE;

    readFileSync.mockReturnValue(JSON.stringify(SUITES));
    // Treat every suite config path as present in the git tree.
    execFileSync.mockImplementation((_cmd: string, args: string[]) => args[args.length - 1]);
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  describe('the eval gate (shouldRunEvals / getEvalTriggerStep)', () => {
    it('does not run evals without any eval labels', () => {
      expect(shouldRunEvals('')).toBe(false);
      expect(getEvalTriggerStep('')).toBeNull();
      expect(getEvalPipeline('')).toBeNull();
    });

    it('does not run evals for an `evals:*` label without a `models:*` label (no suite defaults)', () => {
      expect(shouldRunEvals('evals:agent-builder')).toBe(false);
      expect(getEvalTriggerStep('evals:agent-builder')).toBeNull();
    });

    it('runs evals for a suite that pins defaultModelGroups even without a `models:*` label', () => {
      expect(shouldRunEvals('evals:smoke-tests')).toBe(true);
      expect(getEvalTriggerStep('evals:smoke-tests')).not.toBeNull();
    });

    it('runs evals when both `evals:*` and `models:*` labels are present', () => {
      expect(shouldRunEvals('evals:agent-builder,models:eis/openai-gpt-5.4')).toBe(true);
    });
  });

  describe('getEvalTriggerStep', () => {
    it('emits an async, soft-failing trigger to kibana-evals-pr that depends on build', () => {
      const step = parseStep(
        getEvalTriggerStep('evals:agent-builder,models:eis/openai-gpt-5.4') as string
      );

      expect(step.trigger).toBe('kibana-evals-pr');
      expect(step.async).toBe(true);
      expect(step.soft_fail).toBe(true);
      expect(step.depends_on).toEqual(['build']);
    });

    it('forwards commit, branch, labels, PR number and build id to the dedicated pipeline', () => {
      const labels = 'evals:agent-builder,models:eis/openai-gpt-5.4';
      const step = parseStep(getEvalTriggerStep(labels) as string);

      expect(step.build.commit).toBe('${BUILDKITE_COMMIT}');
      expect(step.build.branch).toBe('${BUILDKITE_BRANCH}');
      expect(step.build.env.GITHUB_PR_LABELS).toBe(labels);
      expect(step.build.env.GITHUB_PR_NUMBER).toBe('${GITHUB_PR_NUMBER:-}');
      // Reuse the PR build's distributable, falling back to this build's id.
      expect(step.build.env.KIBANA_BUILD_ID).toBe('${KIBANA_BUILD_ID:-$BUILDKITE_BUILD_ID}');
    });
  });

  describe('getEvalPipeline preemptible gating', () => {
    it('uses preemptible agents with a lost-worker retry by default', () => {
      const yaml = getEvalPipeline('evals:agent-builder,models:eis/openai-gpt-5.4') as string;

      expect(yaml).toContain('preemptible: true');
      expect(yaml).toContain("exit_status: '-1'");
    });

    it('drops preemptible + the lost-worker retry when EVAL_PREEMPTIBLE=0', () => {
      process.env.EVAL_PREEMPTIBLE = '0';
      const yaml = getEvalPipeline('evals:agent-builder,models:eis/openai-gpt-5.4') as string;

      expect(yaml).not.toContain('preemptible: true');
      expect(yaml).not.toContain("exit_status: '-1'");
      // A single generic retry is still allowed.
      expect(yaml).toContain("exit_status: '*'");
    });
  });
});
