/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { applyStepResult } from '.';

describe('applyStepResult', () => {
  describe('waiting kind', () => {
    it('returns waiting when waitingForInput is set and isResuming is false', () => {
      const waitingForInput = { message: 'Please provide input' };

      const result = applyStepResult({ waitingForInput }, false);

      expect(result.kind).toBe('waiting');
    });

    it('passes waitingForInput as the payload', () => {
      const waitingForInput = { message: 'msg', schema: { type: 'object' } };

      const result = applyStepResult({ waitingForInput }, false);

      expect(result.kind).toBe('waiting');
      expect((result as Extract<typeof result, { kind: 'waiting' }>).payload).toBe(waitingForInput);
    });
  });

  describe('finished kind (resume path)', () => {
    it('returns finished when waitingForInput is set but isResuming is true', () => {
      const waitingForInput = { message: 'Please provide input' };

      const result = applyStepResult({ waitingForInput }, true);

      expect(result.kind).toBe('finished');
    });
  });

  describe('failed kind', () => {
    it('returns failed when result has error', () => {
      const error = new Error('step failed');

      const result = applyStepResult({ error }, false);

      expect(result.kind).toBe('failed');
    });

    it('includes the error in the payload', () => {
      const error = new Error('something went wrong');

      const result = applyStepResult({ error }, false);

      expect(result.kind).toBe('failed');
      expect((result as Extract<typeof result, { kind: 'failed' }>).payload.error).toBe(error);
    });
  });

  describe('finished kind (success path)', () => {
    it('returns finished for a successful result with output', () => {
      const output = { value: 42 };

      const result = applyStepResult({ output }, false);

      expect(result.kind).toBe('finished');
      expect((result as Extract<typeof result, { kind: 'finished' }>).payload.output).toEqual(
        output
      );
    });

    it('returns finished with undefined output for an empty result', () => {
      const result = applyStepResult({}, false);

      expect(result.kind).toBe('finished');
      expect(
        (result as Extract<typeof result, { kind: 'finished' }>).payload.output
      ).toBeUndefined();
    });

    it('error takes precedence over output when both are set', () => {
      const error = new Error('err');

      const result = applyStepResult({ error, output: { x: 1 } }, false);

      expect(result.kind).toBe('failed');
    });
  });
});
