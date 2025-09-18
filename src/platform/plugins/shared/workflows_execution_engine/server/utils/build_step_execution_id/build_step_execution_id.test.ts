/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import crypto from 'crypto';
import type { StackFrame } from '@kbn/workflows';
import { buildStepExecutionId } from './build_step_execution_id';

describe('buildStepExecutionId', () => {
  describe('basic functionality', () => {
    it('should generate a deterministic SHA-256 hash', () => {
      const executionId = 'exec-123';
      const stepId = 'step-456';
      const path: StackFrame[] = [];

      const result = buildStepExecutionId(executionId, stepId, path);

      // Should be a 64-character hex string (SHA-256)
      expect(result).toMatch(/^[a-f0-9]{64}$/);
      expect(result.length).toBe(64);
    });

    it('should generate the same hash for identical inputs', () => {
      const executionId = 'exec-123';
      const stepId = 'step-456';
      const path: StackFrame[] = [{ nodeId: 'node-1', stepId: 'parent-step', subScopeId: '1' }];

      const result1 = buildStepExecutionId(executionId, stepId, path);
      const result2 = buildStepExecutionId(executionId, stepId, path);

      expect(result1).toBe(result2);
    });

    it('should generate different hashes for different inputs', () => {
      const executionId = 'exec-123';
      const stepId = 'step-456';
      const path: StackFrame[] = [];

      const result1 = buildStepExecutionId(executionId, stepId, path);
      const result2 = buildStepExecutionId('exec-456', stepId, path);

      expect(result1).not.toBe(result2);
    });
  });

  describe('with empty path', () => {
    it('should handle empty path array', () => {
      const executionId = 'exec-123';
      const stepId = 'step-456';
      const path: StackFrame[] = [];

      const result = buildStepExecutionId(executionId, stepId, path);

      // Manually compute expected hash for verification
      const expectedInput = 'exec-123_step-456';
      const expectedHash = crypto.createHash('sha256').update(expectedInput).digest('hex');

      expect(result).toBe(expectedHash);
    });
  });

  describe('with single path entry', () => {
    it('should include single path entry in hash computation', () => {
      const executionId = 'exec-123';
      const stepId = 'step-456';
      const path: StackFrame[] = [{ nodeId: 'node-1', stepId: 'parent-step', subScopeId: '1' }];

      const result = buildStepExecutionId(executionId, stepId, path);

      // Manually compute expected hash
      const expectedInput = 'exec-123_parent-step_1_step-456';
      const expectedHash = crypto.createHash('sha256').update(expectedInput).digest('hex');

      expect(result).toBe(expectedHash);
    });

    it('should handle path entry with empty subScopeId', () => {
      const executionId = 'exec-123';
      const stepId = 'step-456';
      const path: StackFrame[] = [{ nodeId: 'node-1', stepId: 'parent-step', subScopeId: '' }];

      const result = buildStepExecutionId(executionId, stepId, path);

      // Should include empty subScopeId in the computation
      const expectedInput = 'exec-123_parent-step__step-456';
      const expectedHash = crypto.createHash('sha256').update(expectedInput).digest('hex');

      expect(result).toBe(expectedHash);
    });
  });

  describe('with multiple path entries', () => {
    it('should include all path entries in order', () => {
      const executionId = 'exec-123';
      const stepId = 'step-456';
      const path: StackFrame[] = [
        { nodeId: 'node-1', stepId: 'foreach-step', subScopeId: '1' },
        { nodeId: 'node-2', stepId: 'nested-step', subScopeId: '2' },
        { nodeId: 'node-3', stepId: 'deep-step', subScopeId: '3' },
      ];

      const result = buildStepExecutionId(executionId, stepId, path);

      // Manually compute expected hash
      const expectedInput = 'exec-123_foreach-step_1_nested-step_2_deep-step_3_step-456';
      const expectedHash = crypto.createHash('sha256').update(expectedInput).digest('hex');

      expect(result).toBe(expectedHash);
    });

    it('should be sensitive to path order', () => {
      const executionId = 'exec-123';
      const stepId = 'step-456';
      const path1: StackFrame[] = [
        { nodeId: 'node-1', stepId: 'step-a', subScopeId: '1' },
        { nodeId: 'node-2', stepId: 'step-b', subScopeId: '2' },
      ];
      const path2: StackFrame[] = [
        { nodeId: 'node-1', stepId: 'step-b', subScopeId: '2' },
        { nodeId: 'node-2', stepId: 'step-a', subScopeId: '1' },
      ];

      const result1 = buildStepExecutionId(executionId, stepId, path1);
      const result2 = buildStepExecutionId(executionId, stepId, path2);

      expect(result1).not.toBe(result2);
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in IDs', () => {
      const executionId = 'exec-123!@#$%';
      const stepId = 'step_456-789.test';
      const path: StackFrame[] = [
        { nodeId: 'node-1', stepId: 'parent@step', subScopeId: 'scope#1' },
      ];

      const result = buildStepExecutionId(executionId, stepId, path);

      expect(result).toMatch(/^[a-f0-9]{64}$/);
      expect(result.length).toBe(64);
    });

    it('should handle very long IDs', () => {
      const executionId = 'a'.repeat(1000);
      const stepId = 'b'.repeat(1000);
      const path: StackFrame[] = [
        { nodeId: 'node-1', stepId: 'c'.repeat(1000), subScopeId: 'd'.repeat(1000) },
      ];

      const result = buildStepExecutionId(executionId, stepId, path);

      expect(result).toMatch(/^[a-f0-9]{64}$/);
      expect(result.length).toBe(64);
    });

    it('should handle empty string IDs', () => {
      const executionId = '';
      const stepId = '';
      const path: StackFrame[] = [{ nodeId: '', stepId: '', subScopeId: '' }];

      const result = buildStepExecutionId(executionId, stepId, path);

      // Let's construct the expected input to match the actual implementation
      const expectedInput = [
        executionId,
        ...path.flatMap((x) => [x.stepId, x.subScopeId]),
        stepId,
      ].join('_');
      const expectedHash = crypto.createHash('sha256').update(expectedInput).digest('hex');

      expect(result).toBe(expectedHash);
      expect(result).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should handle Unicode characters', () => {
      const executionId = 'exec-🚀';
      const stepId = 'step-✨';
      const path: StackFrame[] = [{ nodeId: 'node-🎯', stepId: 'parent-🎯', subScopeId: '流程' }];

      const result = buildStepExecutionId(executionId, stepId, path);

      expect(result).toMatch(/^[a-f0-9]{64}$/);
      expect(result.length).toBe(64);
    });
  });

  describe('hash collision resistance', () => {
    it('should generate different hashes for similar but different execution IDs', () => {
      const stepId = 'step-456';
      const path: StackFrame[] = [];

      const result1 = buildStepExecutionId('exec-123', stepId, path);
      const result2 = buildStepExecutionId('exec-124', stepId, path);

      expect(result1).not.toBe(result2);
    });

    it('should generate different hashes for similar but different step IDs', () => {
      const executionId = 'exec-123';
      const path: StackFrame[] = [];

      const result1 = buildStepExecutionId(executionId, 'step-456', path);
      const result2 = buildStepExecutionId(executionId, 'step-457', path);

      expect(result1).not.toBe(result2);
    });

    it('should generate different hashes for different path entries', () => {
      const executionId = 'exec-123';
      const stepId = 'step-456';

      const path1: StackFrame[] = [{ nodeId: 'node-1', stepId: 'parent-1', subScopeId: '1' }];
      const path2: StackFrame[] = [{ nodeId: 'node-2', stepId: 'parent-2', subScopeId: '1' }];

      const result1 = buildStepExecutionId(executionId, stepId, path1);
      const result2 = buildStepExecutionId(executionId, stepId, path2);

      expect(result1).not.toBe(result2);
    });

    it('should generate different hashes for different subScopeIds', () => {
      const executionId = 'exec-123';
      const stepId = 'step-456';

      const path1: StackFrame[] = [{ nodeId: 'node-1', stepId: 'parent-step', subScopeId: '1' }];
      const path2: StackFrame[] = [{ nodeId: 'node-1', stepId: 'parent-step', subScopeId: '2' }];

      const result1 = buildStepExecutionId(executionId, stepId, path1);
      const result2 = buildStepExecutionId(executionId, stepId, path2);

      expect(result1).not.toBe(result2);
    });
  });

  describe('real-world usage examples', () => {
    it('should match the example from the JSDoc', () => {
      const executionId = 'exec-123';
      const stepId = 'some-connector-step';
      const path: StackFrame[] = [{ nodeId: 'node-1', stepId: 'foreachstep', subScopeId: '1' }];

      const result = buildStepExecutionId(executionId, stepId, path);

      // Verify the structure matches expectations
      expect(result).toMatch(/^[a-f0-9]{64}$/);
      expect(result.length).toBe(64);

      // Verify deterministic behavior
      const result2 = buildStepExecutionId(executionId, stepId, path);
      expect(result).toBe(result2);
    });

    it('should handle complex nested workflow paths', () => {
      const executionId = 'workflow-execution-abc123';
      const stepId = 'http-request-connector';
      const path: StackFrame[] = [
        { nodeId: 'node-1', stepId: 'main-workflow', subScopeId: '0' },
        { nodeId: 'node-2', stepId: 'parallel-branch', subScopeId: '2' },
        { nodeId: 'node-3', stepId: 'foreach-loop', subScopeId: '5' },
        { nodeId: 'node-4', stepId: 'conditional-check', subScopeId: '1' },
      ];

      const result = buildStepExecutionId(executionId, stepId, path);

      expect(result).toMatch(/^[a-f0-9]{64}$/);
      expect(result.length).toBe(64);

      // Verify it's different from a simpler path
      const simplePath: StackFrame[] = [
        { nodeId: 'node-1', stepId: 'main-workflow', subScopeId: '0' },
      ];
      const simpleResult = buildStepExecutionId(executionId, stepId, simplePath);
      expect(result).not.toBe(simpleResult);
    });
  });
});
