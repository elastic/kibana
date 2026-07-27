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
  getEvalPipeline,
  getEvalTriggerStep,
  getForwardablePrLabels,
  shouldRunEvals,
} from './eval_pipeline';

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

  afterEach(() => {
    jest.restoreAllMocks();
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

    it('does not trigger when the only model label is dropped by forwarding (gate parity)', () => {
      expect(getEvalTriggerStep('evals:agent-builder,models:gpt 5')).toBeNull();
    });
  });

  describe('getEvalTriggerStep', () => {
    it('emits a soft-failing command step that triggers kibana-evals-pr-llm-evals after build', () => {
      const step = parseStep(
        getEvalTriggerStep('evals:agent-builder,models:eis/openai-gpt-5.4') as string
      );

      expect(step.command).toContain('.buildkite/scripts/steps/evals/trigger_pr_evals.sh');
      expect(step.soft_fail).toBe(true);
      expect(step.depends_on).toEqual(['build']);
    });

    it('creates the child build from a script (with PR context) rather than a native trigger step', () => {
      // The PR context needed for fork checkout (and KIBANA_BUILD_ID reuse) is forwarded at
      // runtime by trigger_pr_evals.sh -> trigger_pipeline.ts, so the step is a plain command,
      // not a Buildkite `trigger:` step whose `build:` env can't carry pull_request_* vars.
      const step = parseStep(getEvalTriggerStep('evals:smoke-tests') as string);

      expect(step.trigger).toBeUndefined();
      expect(step.build).toBeUndefined();
    });

    it('forwards only whitespace-free labels to the child via the step env', () => {
      // A sibling label with a space (e.g. GitHub's "good first issue") must not ride along and
      // truncate the CSV in trigger_pipeline.ts's space-delimited transport.
      const step = parseStep(
        getEvalTriggerStep('evals:smoke-tests,good first issue,models:eis/openai-gpt-5.4') as string
      );
      const forwarded = step.env.GITHUB_PR_LABELS as string;

      expect(forwarded).not.toMatch(/\s/);
      expect(forwarded).toContain('evals:smoke-tests');
      expect(forwarded).toContain('models:eis/openai-gpt-5.4');
      expect(forwarded).not.toContain('good first issue');
    });

    it('escapes `$` in forwarded labels so Buildkite will not interpolate them', () => {
      // A whitespace-free but otherwise hostile label (contains `$`) survives filtering, so the
      // embedded value must be `$`-escaped (toBuildkiteYamlString) to avoid upload-time interpolation.
      const raw = getEvalTriggerStep('evals:smoke-tests,models:foo$VAR-bar') as string;
      expect(raw).toContain('foo$$VAR-bar');

      // At the YAML layer the value stays escaped; Buildkite collapses `$$` -> `$` at runtime.
      const step = parseStep(raw);
      expect(step.env.GITHUB_PR_LABELS).toBe('evals:smoke-tests,models:foo$$VAR-bar');
    });
  });

  describe('getForwardablePrLabels', () => {
    it('drops whitespace-containing labels but keeps CI/eval/model labels', () => {
      expect(
        getForwardablePrLabels(
          'Team:x,good first issue,evals:smoke-tests,models:eis/openai-gpt-5.4'
        )
      ).toBe('Team:x,evals:smoke-tests,models:eis/openai-gpt-5.4');
    });

    it('drops labels containing `=` (they truncate the key=value transport)', () => {
      expect(getForwardablePrLabels('evals:smoke-tests,foo=bar,models:eis/openai-gpt-5.4')).toBe(
        'evals:smoke-tests,models:eis/openai-gpt-5.4'
      );
    });

    it('parses the JSON-array label form too (matches the child parser)', () => {
      expect(
        getForwardablePrLabels(
          '["evals:smoke-tests","help wanted","ci:build-with-rspack-optimizer"]'
        )
      ).toBe('evals:smoke-tests,ci:build-with-rspack-optimizer');
    });

    it('returns an empty string when every label contains whitespace', () => {
      expect(getForwardablePrLabels('good first issue,help wanted')).toBe('');
    });
  });

  describe('git-tree filtering (no silent green)', () => {
    it('logs a git failure and yields null instead of silently treating suites as absent', () => {
      execFileSync.mockImplementation(() => {
        throw new Error('fatal: not a git repository');
      });
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(getEvalPipeline('evals:smoke-tests')).toBeNull();
      expect(errorSpy).toHaveBeenCalled();
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
