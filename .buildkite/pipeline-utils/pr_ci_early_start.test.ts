/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  PR_CI_CANCELABLE_COMMAND_PREFIX,
  PR_CI_CANCELABLE_ON_GATE_FAILURE_ENV,
  PR_CI_EARLY_START_COMPAT_BETA_LABEL,
  PR_CI_EARLY_START_PILOT_LABEL,
  appendPrCiCancelableEnv,
  getPrCiEarlyStartDecision,
  getPrCiEarlyStartRolloutBucket,
  isPrCiCancelableCommand,
  parsePrCiEarlyStartRolloutPercent,
  prefixPrCiCancelableCommand,
  relaxDependsOnForPrCiEarlyStart,
  removePostGateWaitStepsForPrCiEarlyStart,
  shouldRelaxDependsOnForPrCiEarlyStart,
  transformPipelineForPrCiEarlyStart,
} from './pr_ci_early_start';

describe('pr_ci_early_start', () => {
  describe('parsePrCiEarlyStartRolloutPercent', () => {
    it('clamps to 0-100', () => {
      expect(parsePrCiEarlyStartRolloutPercent('120')).toBe(100);
      expect(parsePrCiEarlyStartRolloutPercent('-5')).toBe(0);
    });

    it('returns 0 for invalid values', () => {
      expect(parsePrCiEarlyStartRolloutPercent('invalid')).toBe(0);
      expect(parsePrCiEarlyStartRolloutPercent(undefined)).toBe(0);
    });
  });

  describe('getPrCiEarlyStartDecision', () => {
    it('enables early start with explicit opt-in label', () => {
      const decision = getPrCiEarlyStartDecision({
        labels: [PR_CI_EARLY_START_PILOT_LABEL],
        rolloutPercent: 0,
        rolloutSeed: 'seed',
      });

      expect(decision.enabled).toBe(true);
      expect(decision.reason).toBe('label_opt_in');
    });

    it('enables early start with compat beta label', () => {
      const decision = getPrCiEarlyStartDecision({
        labels: [PR_CI_EARLY_START_COMPAT_BETA_LABEL],
        rolloutPercent: 0,
        rolloutSeed: 'seed',
      });

      expect(decision.enabled).toBe(true);
      expect(decision.reason).toBe('label_opt_in');
    });

    it('enables early start for rollout bucket when percent threshold is met', () => {
      const rolloutBucket = getPrCiEarlyStartRolloutBucket('my-seed');
      const decision = getPrCiEarlyStartDecision({
        labels: [],
        rolloutPercent: rolloutBucket + 1,
        rolloutSeed: 'my-seed',
      });

      expect(decision.enabled).toBe(true);
      expect(decision.reason).toBe('percent_rollout');
    });

    it('disables early start when not opted in and rollout threshold is not met', () => {
      const rolloutBucket = getPrCiEarlyStartRolloutBucket('another-seed');
      const decision = getPrCiEarlyStartDecision({
        labels: [],
        rolloutPercent: rolloutBucket,
        rolloutSeed: 'another-seed',
      });

      expect(decision.enabled).toBe(false);
      expect(decision.reason).toBe('disabled');
    });
  });

  describe('dependency helpers', () => {
    it('relaxes only when dependencies include both gate and required non-gate dependency', () => {
      expect(shouldRelaxDependsOnForPrCiEarlyStart(['build', 'quick_checks'])).toBe(true);
      expect(shouldRelaxDependsOnForPrCiEarlyStart(['quick_checks'])).toBe(false);
    });

    it('removes gate dependencies while preserving non-gate dependencies', () => {
      const relaxed = relaxDependsOnForPrCiEarlyStart([
        'build',
        'quick_checks',
        'linting',
        'build_scout_tests',
        'custom_dependency',
      ]);

      expect(relaxed).toEqual(['build', 'build_scout_tests', 'custom_dependency']);
    });
  });

  describe('command helpers', () => {
    it('prefixes cancelable commands and recognizes already-prefixed commands', () => {
      const prefixed = prefixPrCiCancelableCommand('.buildkite/scripts/steps/functional/apm_cypress.sh');

      expect(prefixed).toBe(
        `${PR_CI_CANCELABLE_COMMAND_PREFIX} .buildkite/scripts/steps/functional/apm_cypress.sh`
      );
      expect(isPrCiCancelableCommand(prefixed)).toBe(true);
      expect(prefixPrCiCancelableCommand(prefixed)).toBe(prefixed);
    });
  });

  describe('appendPrCiCancelableEnv', () => {
    it('adds the pr-ci cancelable marker and preserves existing env', () => {
      const env = appendPrCiCancelableEnv({ EXISTING: 'value', NUMERIC: 7 });

      expect(env).toEqual({
        EXISTING: 'value',
        NUMERIC: 7,
        [PR_CI_CANCELABLE_ON_GATE_FAILURE_ENV]: 'true',
      });
    });
  });

  describe('transformPipelineForPrCiEarlyStart', () => {
    it('relaxes group gate dependencies and marks nested commands cancelable', () => {
      const pipeline = {
        steps: [
          {
            group: 'Group step',
            depends_on: ['build', 'quick_checks', 'checks'],
            steps: [
              {
                label: 'Nested command',
                command: '.buildkite/scripts/steps/test/ftr_configs.sh',
              },
            ],
          },
        ],
      };

      const transformed = transformPipelineForPrCiEarlyStart(pipeline);
      expect(transformed).not.toBeNull();
      expect(transformed?.steps[0].depends_on).toBe('build');

      const nested = transformed?.steps[0].steps?.[0] as {
        command?: string;
        env?: Record<string, string | number>;
      };
      expect(nested.command).toBe(
        `${PR_CI_CANCELABLE_COMMAND_PREFIX} .buildkite/scripts/steps/test/ftr_configs.sh`
      );
      expect(nested.env).toEqual({
        [PR_CI_CANCELABLE_ON_GATE_FAILURE_ENV]: 'true',
      });
    });

    it('returns null for invalid pipeline documents', () => {
      expect(transformPipelineForPrCiEarlyStart({})).toBeNull();
      expect(transformPipelineForPrCiEarlyStart({ steps: 'invalid' })).toBeNull();
    });

    it('transforms object steps even when wait scalar steps are present', () => {
      const pipeline = {
        steps: ['wait', { command: '.buildkite/scripts/steps/test/ftr_configs.sh', depends_on: ['build', 'checks'] }],
      };

      const transformed = transformPipelineForPrCiEarlyStart(pipeline);
      expect(transformed).not.toBeNull();
      expect(transformed?.steps[0]).toBe('wait');
      expect((transformed?.steps[1] as { command?: string }).command).toBe(
        `${PR_CI_CANCELABLE_COMMAND_PREFIX} .buildkite/scripts/steps/test/ftr_configs.sh`
      );
    });
  });

  describe('removePostGateWaitStepsForPrCiEarlyStart', () => {
    it('removes wait steps that appear after gate steps', () => {
      const pipeline = {
        steps: [
          'wait',
          { key: 'build', command: 'build.sh' },
          { key: 'quick_checks', command: 'quick_checks.sh' },
          'wait',
          { key: 'post_build', command: 'post_build.sh' },
        ],
      };

      const normalized = removePostGateWaitStepsForPrCiEarlyStart(pipeline);
      expect(normalized.steps).toEqual([
        'wait',
        { key: 'build', command: 'build.sh' },
        { key: 'quick_checks', command: 'quick_checks.sh' },
        { key: 'post_build', command: 'post_build.sh' },
      ]);
    });
  });
});
