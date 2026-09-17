/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import {
  computeHitlWaitDeadlineMs,
  DYNAMIC_TIMEOUT_STATE_KEY,
  getHitlIdleDeadlineMsForStep,
  hasHitlWaitExpired,
  persistResolvedDynamicTimeout,
  resolveDynamicTimeout,
} from './hitl_timeout_helpers';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';

describe('hitl_timeout_helpers', () => {
  describe('computeHitlWaitDeadlineMs', () => {
    it('returns undefined when startedAt is missing', () => {
      expect(computeHitlWaitDeadlineMs(undefined, '30s')).toBeUndefined();
    });

    it('returns startedAt plus parsed timeout', () => {
      expect(computeHitlWaitDeadlineMs('2025-06-01T12:00:00.000Z', '30s')).toBe(
        new Date('2025-06-01T12:00:30.000Z').getTime()
      );
    });
  });

  describe('hasHitlWaitExpired', () => {
    it('returns false when startedAt is missing', () => {
      expect(hasHitlWaitExpired(undefined, '30s', Date.parse('2025-06-01T12:01:00.000Z'))).toBe(
        false
      );
    });

    it('returns false before the deadline', () => {
      expect(
        hasHitlWaitExpired(
          '2025-06-01T12:00:00.000Z',
          '30s',
          Date.parse('2025-06-01T12:00:29.999Z')
        )
      ).toBe(false);
    });

    it('returns true at or after the deadline', () => {
      expect(
        hasHitlWaitExpired(
          '2025-06-01T12:00:00.000Z',
          '30s',
          Date.parse('2025-06-01T12:00:30.000Z')
        )
      ).toBe(true);
    });
  });

  describe('resolveDynamicTimeout', () => {
    it('renders then validates the duration', () => {
      expect(
        resolveDynamicTimeout("{{ inputs.expiresIn | default: '72h' }}", '24h', () => '1h')
      ).toBe('1h');
    });

    it('throws when the rendered value is not a duration', () => {
      expect(() => resolveDynamicTimeout('{{ inputs.expiresIn }}', '24h', () => 'soon')).toThrow(
        'Invalid duration format: soon'
      );
    });

    it('throws when the rendered duration is 65 characters', () => {
      const rendered = `${'1'.repeat(64)}s`;
      expect(rendered).toHaveLength(65);
      expect(() => resolveDynamicTimeout('{{ inputs.expiresIn }}', '24h', () => rendered)).toThrow(
        'Invalid duration format'
      );
    });

    it('accepts compound durations', () => {
      expect(resolveDynamicTimeout('{{ inputs.expiresIn }}', '24h', () => '1h30m')).toBe('1h30m');
    });
  });

  describe('getHitlIdleDeadlineMsForStep', () => {
    it('returns undefined for non-HITL nodes', () => {
      const stepExecutionRuntime = {
        node: { stepType: 'console' },
        stepExecution: { startedAt: '2025-06-01T12:00:00.000Z' },
      } as unknown as StepExecutionRuntime;

      expect(getHitlIdleDeadlineMsForStep(stepExecutionRuntime)).toBeUndefined();
    });

    it('returns waitForInput deadline using the default timeout', () => {
      const stepExecutionRuntime = {
        node: {
          type: 'waitForInput',
          stepType: 'waitForInput',
          configuration: {},
        },
        stepExecution: {
          status: ExecutionStatus.WAITING_FOR_INPUT,
          startedAt: '2025-06-01T12:00:00.000Z',
        },
      } as unknown as StepExecutionRuntime;

      expect(getHitlIdleDeadlineMsForStep(stepExecutionRuntime)).toBe(
        new Date('2025-06-01T12:00:00.000Z').getTime() + 72 * 60 * 60 * 1000
      );
    });

    it('prefers the persisted timeout over the YAML template', () => {
      const stepExecutionRuntime = {
        node: {
          type: 'waitForApproval',
          stepType: 'waitForApproval',
          configuration: { timeout: "{{ inputs.expiresIn | default: '72h' }}" },
        },
        stepExecution: {
          startedAt: '2025-06-01T12:00:00.000Z',
          state: { [DYNAMIC_TIMEOUT_STATE_KEY]: '1h' },
        },
      } as unknown as StepExecutionRuntime;

      expect(getHitlIdleDeadlineMsForStep(stepExecutionRuntime)).toBe(
        new Date('2025-06-01T13:00:00.000Z').getTime()
      );
    });
  });

  describe('persistResolvedDynamicTimeout', () => {
    it('writes the rendered duration onto step state', () => {
      const setCurrentStepState = jest.fn();
      const stepExecutionRuntime = {
        stepExecution: { state: { resumeAt: undefined } },
        contextManager: {
          renderValueAccordingToContext: jest.fn(() => '2h'),
        },
        setCurrentStepState,
      } as unknown as StepExecutionRuntime;

      expect(
        persistResolvedDynamicTimeout(
          stepExecutionRuntime,
          "{{ inputs.expiresIn | default: '72h' }}",
          '24h'
        )
      ).toBe('2h');
      expect(setCurrentStepState).toHaveBeenCalledWith({
        resumeAt: undefined,
        [DYNAMIC_TIMEOUT_STATE_KEY]: '2h',
      });
    });
  });
});
