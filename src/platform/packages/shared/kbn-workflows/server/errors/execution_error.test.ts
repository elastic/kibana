/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionError } from './execution_error';

describe('ExecutionError', () => {
  describe('constructor', () => {
    it('sets type, message, and details', () => {
      const error = new ExecutionError({
        type: 'ValidationError',
        message: 'Invalid input',
        details: { field: 'name' },
      });

      expect(error.type).toBe('ValidationError');
      expect(error.message).toBe('Invalid input');
      expect(error.details).toEqual({ field: 'name' });
    });

    it('leaves details undefined when not provided', () => {
      const error = new ExecutionError({ type: 'Timeout', message: 'Timed out' });
      expect(error.details).toBeUndefined();
    });

    it('is an instance of Error', () => {
      const error = new ExecutionError({ type: 'Test', message: 'test' });
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('fromError', () => {
    it('returns the same instance when given an ExecutionError', () => {
      const original = new ExecutionError({ type: 'Test', message: 'test' });
      expect(ExecutionError.fromError(original)).toBe(original);
    });

    it('wraps a standard Error into an ExecutionError', () => {
      const stdError = new TypeError('bad type');
      const result = ExecutionError.fromError(stdError);

      expect(result).toBeInstanceOf(ExecutionError);
      expect(result.type).toBe('TypeError');
      expect(result.message).toBe('bad type');
      expect(result.details).toBeUndefined();
    });

    it('uses "Error" as fallback type when error.name is empty', () => {
      const stdError = new Error('no name');
      stdError.name = '';
      const result = ExecutionError.fromError(stdError);

      expect(result.type).toBe('Error');
    });

    it('does not leak stack or other Error properties', () => {
      const stdError = new Error('sensitive');
      const result = ExecutionError.fromError(stdError);

      // Only type and message are transferred, no stack
      expect(result.type).toBe('Error');
      expect(result.message).toBe('sensitive');
      expect(result.details).toBeUndefined();
    });
  });

  describe('toSerializableObject', () => {
    it('includes details when present', () => {
      const error = new ExecutionError({
        type: 'Test',
        message: 'msg',
        details: { key: 'value' },
      });
      const serialized = error.toSerializableObject();

      expect(serialized).toEqual({ type: 'Test', message: 'msg', details: { key: 'value' } });
    });

    it('excludes details key when not present', () => {
      const error = new ExecutionError({ type: 'Test', message: 'msg' });
      const serialized = error.toSerializableObject();

      expect(serialized).toEqual({ type: 'Test', message: 'msg' });
      expect('details' in serialized).toBe(false);
    });

    it('does not include stack or name in serialized output', () => {
      const error = new ExecutionError({ type: 'Test', message: 'msg' });
      const serialized = error.toSerializableObject();

      expect(Object.keys(serialized)).toEqual(['type', 'message']);
    });
  });
});
