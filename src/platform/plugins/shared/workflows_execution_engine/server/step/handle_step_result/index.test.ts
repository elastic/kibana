/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import { ExecutionError } from '@kbn/workflows/server';
import type { HandleStepResultDeps, HandleStepResultLogger } from '.';
import { handleStepResult } from '.';
import type { ApplyStepResultOutput } from '../helpers/apply_step_result';

const createDeps = (): jest.Mocked<HandleStepResultDeps> => ({
  failStep: jest.fn(),
  finishStep: jest.fn(),
  setCurrentStepState: jest.fn(),
  setInput: jest.fn(),
  tryEnterWaitUntil: jest.fn(),
});

const createLogger = (): jest.Mocked<HandleStepResultLogger> => ({
  debug: jest.fn(),
  error: jest.fn(),
});

describe('handleStepResult', () => {
  describe('waiting kind', () => {
    it('calls setCurrentStepState with the kind sentinel and any stepState', () => {
      const deps = createDeps();
      const logger = createLogger();
      const stepResult: ApplyStepResultOutput = {
        kind: 'waiting',
        payload: { message: 'fill form', stepState: { innerExecutionId: 'exec-1' } },
      };

      handleStepResult(deps, logger, stepResult);

      expect(deps.setCurrentStepState).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'waiting_for_input', innerExecutionId: 'exec-1' })
      );
    });

    it('calls setInput with the waiting payload fields', () => {
      const deps = createDeps();
      const logger = createLogger();
      const stepResult: ApplyStepResultOutput = {
        kind: 'waiting',
        payload: { message: 'fill form' },
      };

      handleStepResult(deps, logger, stepResult);

      expect(deps.setInput).toHaveBeenCalledWith(expect.objectContaining({ message: 'fill form' }));
    });

    it('calls tryEnterWaitUntil with WAITING_FOR_INPUT status', () => {
      const deps = createDeps();
      const logger = createLogger();
      const stepResult: ApplyStepResultOutput = {
        kind: 'waiting',
        payload: { message: 'fill form' },
      };

      handleStepResult(deps, logger, stepResult);

      expect(deps.tryEnterWaitUntil).toHaveBeenCalledWith(
        undefined,
        ExecutionStatus.WAITING_FOR_INPUT
      );
    });

    it('returns waiting', () => {
      const deps = createDeps();
      const logger = createLogger();
      const stepResult: ApplyStepResultOutput = {
        kind: 'waiting',
        payload: { message: 'fill form' },
      };

      const outcome = handleStepResult(deps, logger, stepResult);

      expect(outcome).toBe('waiting');
    });

    it('emits a [hitl-debug][wf] waitForInput.enter debug marker with schemaPresent and messagePresent', () => {
      const deps = createDeps();
      const logger = createLogger();
      const stepResult: ApplyStepResultOutput = {
        kind: 'waiting',
        payload: { message: 'fill form', schema: { type: 'object' }, stepState: {} },
      };

      handleStepResult(deps, logger, stepResult);

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('[hitl-debug][wf] waitForInput.enter')
      );
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('schemaPresent=true'));
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('messagePresent=true'));
    });
  });

  describe('failed kind', () => {
    it('calls failStep with an ExecutionError derived from the payload error', () => {
      const deps = createDeps();
      const logger = createLogger();
      const error = new Error('step error');
      const stepResult: ApplyStepResultOutput = { kind: 'failed', payload: { error } };

      handleStepResult(deps, logger, stepResult);

      expect(deps.failStep).toHaveBeenCalledWith(expect.any(ExecutionError));
    });

    it('returns failed', () => {
      const deps = createDeps();
      const logger = createLogger();
      const stepResult: ApplyStepResultOutput = {
        kind: 'failed',
        payload: { error: new Error('err') },
      };

      const outcome = handleStepResult(deps, logger, stepResult);

      expect(outcome).toBe('failed');
    });
  });

  describe('finished kind', () => {
    it('calls finishStep with the output payload', () => {
      const deps = createDeps();
      const logger = createLogger();
      const output = { result: 'done' };
      const stepResult: ApplyStepResultOutput = { kind: 'finished', payload: { output } };

      handleStepResult(deps, logger, stepResult);

      expect(deps.finishStep).toHaveBeenCalledWith(output);
    });

    it('calls finishStep with undefined output when not provided', () => {
      const deps = createDeps();
      const logger = createLogger();
      const stepResult: ApplyStepResultOutput = { kind: 'finished', payload: {} };

      handleStepResult(deps, logger, stepResult);

      expect(deps.finishStep).toHaveBeenCalledWith(undefined);
    });

    it('returns finished', () => {
      const deps = createDeps();
      const logger = createLogger();
      const stepResult: ApplyStepResultOutput = { kind: 'finished', payload: { output: 42 } };

      const outcome = handleStepResult(deps, logger, stepResult);

      expect(outcome).toBe('finished');
    });
  });

  describe('default (unexpected kind)', () => {
    it('calls logger.error with a message that includes the unexpected kind', () => {
      const deps = createDeps();
      const logger = createLogger();
      const badResult = { kind: 'unrecognized_kind' } as unknown as ApplyStepResultOutput;

      handleStepResult(deps, logger, badResult);

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('unrecognized_kind'));
    });

    it('returns unexpected_kind', () => {
      const deps = createDeps();
      const logger = createLogger();
      const badResult = { kind: 'unrecognized_kind' } as unknown as ApplyStepResultOutput;

      const outcome = handleStepResult(deps, logger, badResult);

      expect(outcome).toBe('unexpected_kind');
    });
  });
});
