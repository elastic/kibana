/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import crypto from 'crypto';
import { buildStepExecutionId } from './build_step_execution_id';

describe('buildStepExecutionId', () => {
  describe('basic functionality', () => {
    it('should generate a deterministic SHA-256 hash for valid inputs', () => {
      const executionId = 'exec-123';
      const stepId = 'some-connector-step';
      const path = ['foreachstep', '1'];

      const result = buildStepExecutionId(executionId, stepId, path);

      // Should be a valid hex string of length 64 (SHA-256)
      expect(result).toMatch(/^[a-f0-9]{64}$/);
      expect(result).toHaveLength(64);
    });

    it('should generate the same ID for identical inputs (deterministic)', () => {
      const executionId = 'exec-123';
      const stepId = 'some-connector-step';
      const path = ['foreachstep', '1'];

      const result1 = buildStepExecutionId(executionId, stepId, path);
      const result2 = buildStepExecutionId(executionId, stepId, path);

      expect(result1).toBe(result2);
    });

    it('should generate different IDs for different inputs', () => {
      const baseParams = {
        executionId: 'exec-123',
        stepId: 'some-connector-step',
        path: ['foreachstep', '1'],
      };

      const result1 = buildStepExecutionId(
        baseParams.executionId,
        baseParams.stepId,
        baseParams.path
      );

      const result2 = buildStepExecutionId(
        'exec-456', // different executionId
        baseParams.stepId,
        baseParams.path
      );

      expect(result1).not.toBe(result2);
    });
  });

  describe('parameter variations', () => {
    it('should handle empty path array', () => {
      const result = buildStepExecutionId('exec-123', 'step-id', []);

      expect(result).toMatch(/^[a-f0-9]{64}$/);
      expect(result).toHaveLength(64);
    });

    it('should handle single element in path array', () => {
      const result = buildStepExecutionId('exec-123', 'step-id', ['single']);

      expect(result).toMatch(/^[a-f0-9]{64}$/);
      expect(result).toHaveLength(64);
    });

    it('should handle multiple elements in path array', () => {
      const path = ['level1', 'level2', 'level3', 'level4'];
      const result = buildStepExecutionId('exec-123', 'step-id', path);

      expect(result).toMatch(/^[a-f0-9]{64}$/);
      expect(result).toHaveLength(64);
    });

    it('should handle special characters in inputs', () => {
      const executionId = 'exec-123-special!@#';
      const stepId = 'step-with-dashes_and_underscores.dots';
      const path = ['path/with/slashes', 'path with spaces', 'path-with-special@chars'];

      const result = buildStepExecutionId(executionId, stepId, path);

      expect(result).toMatch(/^[a-f0-9]{64}$/);
      expect(result).toHaveLength(64);
    });

    it('should handle empty strings', () => {
      const result = buildStepExecutionId('', '', ['']);

      expect(result).toMatch(/^[a-f0-9]{64}$/);
      expect(result).toHaveLength(64);
    });
  });

  describe('deterministic behavior with different parameters', () => {
    it('should generate different IDs when executionId changes', () => {
      const baseStepId = 'step-id';
      const basePath = ['path'];

      const result1 = buildStepExecutionId('exec-1', baseStepId, basePath);
      const result2 = buildStepExecutionId('exec-2', baseStepId, basePath);

      expect(result1).not.toBe(result2);
    });

    it('should generate different IDs when stepId changes', () => {
      const baseExecutionId = 'exec-123';
      const basePath = ['path'];

      const result1 = buildStepExecutionId(baseExecutionId, 'step-1', basePath);
      const result2 = buildStepExecutionId(baseExecutionId, 'step-2', basePath);

      expect(result1).not.toBe(result2);
    });

    it('should generate different IDs when path changes', () => {
      const baseExecutionId = 'exec-123';
      const baseStepId = 'step-id';

      const result1 = buildStepExecutionId(baseExecutionId, baseStepId, ['path1']);
      const result2 = buildStepExecutionId(baseExecutionId, baseStepId, ['path2']);

      expect(result1).not.toBe(result2);
    });

    it('should generate different IDs when path order changes', () => {
      const baseExecutionId = 'exec-123';
      const baseStepId = 'step-id';

      const result1 = buildStepExecutionId(baseExecutionId, baseStepId, ['a', 'b']);
      const result2 = buildStepExecutionId(baseExecutionId, baseStepId, ['b', 'a']);

      expect(result1).not.toBe(result2);
    });

    it('should generate different IDs when path length changes', () => {
      const baseExecutionId = 'exec-123';
      const baseStepId = 'step-id';

      const result1 = buildStepExecutionId(baseExecutionId, baseStepId, ['path']);
      const result2 = buildStepExecutionId(baseExecutionId, baseStepId, ['path', 'extra']);

      expect(result1).not.toBe(result2);
    });
  });

  describe('hash validation', () => {
    it('should match manually calculated SHA-256 hash', () => {
      const executionId = 'exec-123';
      const stepId = 'step-id';
      const path = ['path1', 'path2'];

      const result = buildStepExecutionId(executionId, stepId, path);

      // Manual calculation for verification
      const expectedInput = [executionId, ...path, stepId].join('_');
      const expectedHash = crypto.createHash('sha256').update(expectedInput).digest('hex');

      expect(result).toBe(expectedHash);
    });

    it('should correctly join parameters with underscore separator', () => {
      const executionId = 'exec';
      const stepId = 'step';
      const path = ['a', 'b'];

      const result = buildStepExecutionId(executionId, stepId, path);

      // The joined string should be: 'exec_a_b_step'
      const expectedInput = 'exec_a_b_step';
      const expectedHash = crypto.createHash('sha256').update(expectedInput).digest('hex');

      expect(result).toBe(expectedHash);
    });
  });

  describe('edge cases', () => {
    it('should handle unicode characters', () => {
      const executionId = 'exec-🚀';
      const stepId = 'step-💫';
      const path = ['path-🌟', 'パス'];

      const result = buildStepExecutionId(executionId, stepId, path);

      expect(result).toMatch(/^[a-f0-9]{64}$/);
      expect(result).toHaveLength(64);
    });

    it('should handle very long strings', () => {
      const longString = 'a'.repeat(1000);
      const result = buildStepExecutionId(longString, longString, [longString]);

      expect(result).toMatch(/^[a-f0-9]{64}$/);
      expect(result).toHaveLength(64);
    });

    it('should handle strings with underscore characters (separator)', () => {
      // This tests potential collision scenarios with the separator
      const executionId = 'exec_with_underscores';
      const stepId = 'step_with_underscores';
      const path = ['path_with_underscores'];

      const result = buildStepExecutionId(executionId, stepId, path);

      expect(result).toMatch(/^[a-f0-9]{64}$/);
      expect(result).toHaveLength(64);

      // Should be different from a similar but different combination
      const result2 = buildStepExecutionId('exec_with', 'underscores', ['path_with_underscores']);
      expect(result).not.toBe(result2);
    });
  });

  describe('real-world scenarios', () => {
    it('should handle typical workflow execution scenario', () => {
      const executionId = 'workflow-exec-2024-01-15-abc123';
      const stepId = 'send-email-notification';
      const path = ['parallel-branch', 'notification-group', 'retry-attempt-1'];

      const result = buildStepExecutionId(executionId, stepId, path);

      expect(result).toMatch(/^[a-f0-9]{64}$/);
      expect(result).toHaveLength(64);
    });

    it('should handle nested foreach loops scenario', () => {
      const executionId = 'complex-workflow-456';
      const stepId = 'process-item';
      const path = ['foreach-users', '0', 'foreach-documents', '5', 'foreach-pages', '10'];

      const result = buildStepExecutionId(executionId, stepId, path);

      expect(result).toMatch(/^[a-f0-9]{64}$/);
      expect(result).toHaveLength(64);
    });

    it('should maintain consistency across multiple calls in same execution context', () => {
      const executionId = 'stable-exec-789';
      const baseStepId = 'connector-step';
      const basePath = ['branch', 'sub-branch'];

      // Simulate multiple calls that should return the same result
      const results = Array.from({ length: 10 }, () =>
        buildStepExecutionId(executionId, baseStepId, basePath)
      );

      // All results should be identical
      const firstResult = results[0];
      results.forEach((result) => {
        expect(result).toBe(firstResult);
      });
    });
  });
});
