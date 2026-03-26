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
    it('should generate a SHA-256 hash for a simple case with no stack frames', () => {
      const executionId = 'workflow-exec-abc123';
      const stepId = 'connector-send-email';
      const stackFrames: StackFrame[] = [];

      const result = buildStepExecutionId(executionId, stepId, stackFrames);

      // Should be a valid SHA-256 hash (64 characters, hexadecimal)
      expect(result).toMatch(/^[a-f0-9]{64}$/);
      expect(result.length).toBe(64);

      // Verify it's deterministic by calling again
      const result2 = buildStepExecutionId(executionId, stepId, stackFrames);
      expect(result).toBe(result2);
    });

    it('should generate a SHA-256 hash for a case with stack frames', () => {
      const executionId = 'workflow-exec-abc123';
      const stepId = 'connector-send-email';
      const stackFrames: StackFrame[] = [
        {
          stepId: 'foreachstep',
          nestedScopes: [{ nodeId: 'enterForeach_step1', nodeType: 'foreach', scopeId: '1' }],
        },
      ];

      const result = buildStepExecutionId(executionId, stepId, stackFrames);

      // Should be a valid SHA-256 hash
      expect(result).toMatch(/^[a-f0-9]{64}$/);
      expect(result.length).toBe(64);
    });

    it('should be deterministic - same inputs produce same output', () => {
      const executionId = 'workflow-exec-abc123';
      const stepId = 'connector-send-email';
      const stackFrames: StackFrame[] = [
        {
          stepId: 'foreachstep',
          nestedScopes: [{ nodeId: 'enterForeach_step1', nodeType: 'foreach', scopeId: '1' }],
        },
      ];

      const result1 = buildStepExecutionId(executionId, stepId, stackFrames);
      const result2 = buildStepExecutionId(executionId, stepId, stackFrames);
      const result3 = buildStepExecutionId(executionId, stepId, stackFrames);

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });
  });

  describe('different inputs produce different outputs', () => {
    it('should generate different hashes for different execution IDs', () => {
      const stepId = 'connector-send-email';
      const stackFrames: StackFrame[] = [];

      const result1 = buildStepExecutionId('execution-1', stepId, stackFrames);
      const result2 = buildStepExecutionId('execution-2', stepId, stackFrames);

      expect(result1).not.toBe(result2);
    });

    it('should generate different hashes for different step IDs', () => {
      const executionId = 'workflow-exec-abc123';
      const stackFrames: StackFrame[] = [];

      const result1 = buildStepExecutionId(executionId, 'step-1', stackFrames);
      const result2 = buildStepExecutionId(executionId, 'step-2', stackFrames);

      expect(result1).not.toBe(result2);
    });

    it('should generate different hashes for different stack frames', () => {
      const executionId = 'workflow-exec-abc123';
      const stepId = 'connector-send-email';

      const stackFrames1: StackFrame[] = [
        {
          stepId: 'foreachstep',
          nestedScopes: [{ nodeId: 'enterForeach_step1', nodeType: 'foreach', scopeId: '1' }],
        },
      ];

      const stackFrames2: StackFrame[] = [
        {
          stepId: 'foreachstep',
          nestedScopes: [{ nodeId: 'enterForeach_step1', nodeType: 'foreach', scopeId: '2' }],
        },
      ];

      const result1 = buildStepExecutionId(executionId, stepId, stackFrames1);
      const result2 = buildStepExecutionId(executionId, stepId, stackFrames2);

      expect(result1).not.toBe(result2);
    });
  });

  describe('complex stack frame scenarios', () => {
    it('should handle multiple stack frames', () => {
      const executionId = 'workflow-exec-abc123';
      const stepId = 'connector-send-email';
      const stackFrames: StackFrame[] = [
        {
          stepId: 'retrystep',
          nestedScopes: [{ nodeId: 'enterRetry_step1', nodeType: 'retry', scopeId: 'attempt-1' }],
        },
        {
          stepId: 'foreachstep',
          nestedScopes: [{ nodeId: 'enterForeach_step2', nodeType: 'foreach', scopeId: '0' }],
        },
      ];

      const result = buildStepExecutionId(executionId, stepId, stackFrames);

      expect(result).toMatch(/^[a-f0-9]{64}$/);
      expect(result.length).toBe(64);
    });

    it('should handle stack frames with multiple nested scopes', () => {
      const executionId = 'workflow-exec-abc123';
      const stepId = 'connector-send-email';
      const stackFrames: StackFrame[] = [
        {
          stepId: 'parentstep',
          nestedScopes: [
            { nodeId: 'enterForeach_step1', nodeType: 'foreach', scopeId: '0' },
            { nodeId: 'enterRetry_step2', nodeType: 'retry', scopeId: 'attempt-1' },
          ],
        },
      ];

      const result = buildStepExecutionId(executionId, stepId, stackFrames);

      expect(result).toMatch(/^[a-f0-9]{64}$/);
      expect(result.length).toBe(64);
    });

    it('should handle stack frames with empty scopeId', () => {
      const executionId = 'workflow-exec-abc123';
      const stepId = 'connector-send-email';
      const stackFrames: StackFrame[] = [
        {
          stepId: 'foreachstep',
          nestedScopes: [{ nodeId: 'enterForeach_step1', nodeType: 'foreach' }], // no scopeId
        },
      ];

      const result = buildStepExecutionId(executionId, stepId, stackFrames);

      expect(result).toMatch(/^[a-f0-9]{64}$/);
      expect(result.length).toBe(64);
    });

    it('should handle stack frames with undefined scopeId', () => {
      const executionId = 'workflow-exec-abc123';
      const stepId = 'connector-send-email';
      const stackFrames: StackFrame[] = [
        {
          stepId: 'foreachstep',
          nestedScopes: [{ nodeId: 'enterForeach_step1', nodeType: 'foreach', scopeId: undefined }],
        },
      ];

      const result = buildStepExecutionId(executionId, stepId, stackFrames);

      expect(result).toMatch(/^[a-f0-9]{64}$/);
      expect(result.length).toBe(64);
    });

    it('should handle empty nested scopes array', () => {
      const executionId = 'workflow-exec-abc123';
      const stepId = 'connector-send-email';
      const stackFrames: StackFrame[] = [
        {
          stepId: 'somestep',
          nestedScopes: [],
        },
      ];

      const result = buildStepExecutionId(executionId, stepId, stackFrames);

      expect(result).toMatch(/^[a-f0-9]{64}$/);
      expect(result.length).toBe(64);
    });
  });

  describe('edge cases', () => {
    it('should handle empty strings', () => {
      const result = buildStepExecutionId('', '', []);

      expect(result).toMatch(/^[a-f0-9]{64}$/);
      expect(result.length).toBe(64);
    });

    it('should handle special characters in IDs', () => {
      const executionId = 'workflow-exec-abc123!@#$%^&*()';
      const stepId = 'connector-send-email-with-special-chars_123';
      const stackFrames: StackFrame[] = [
        {
          stepId: 'special-step-123',
          nestedScopes: [{ nodeId: 'node@123', nodeType: 'foreach', scopeId: 'scope#456' }],
        },
      ];

      const result = buildStepExecutionId(executionId, stepId, stackFrames);

      expect(result).toMatch(/^[a-f0-9]{64}$/);
      expect(result.length).toBe(64);
    });

    it('should handle very long strings', () => {
      const longString = 'a'.repeat(1000);
      const result = buildStepExecutionId(longString, longString, []);

      expect(result).toMatch(/^[a-f0-9]{64}$/);
      expect(result.length).toBe(64);
    });
  });

  describe('internal hash generation', () => {
    it('should match expected hash for known input', () => {
      const executionId = 'test-exec-123';
      const stepId = 'test-step';
      const stackFrames: StackFrame[] = [];

      // Calculate expected hash manually to verify implementation
      const expectedInput = 'test-exec-123_test-step';
      const expectedHash = crypto.createHash('sha256').update(expectedInput).digest('hex');

      const result = buildStepExecutionId(executionId, stepId, stackFrames);

      expect(result).toBe(expectedHash);
    });

    it('should match expected hash for input with stack frames', () => {
      const executionId = 'test-exec-123';
      const stepId = 'test-step';
      const stackFrames: StackFrame[] = [
        {
          stepId: 'parent-step',
          nestedScopes: [{ nodeId: 'node1', nodeType: 'foreach', scopeId: 'scope1' }],
        },
      ];

      // Calculate expected hash manually
      const expectedInput = 'test-exec-123_parent-step_scope1_test-step';
      const expectedHash = crypto.createHash('sha256').update(expectedInput).digest('hex');

      const result = buildStepExecutionId(executionId, stepId, stackFrames);

      expect(result).toBe(expectedHash);
    });

    it('should include empty string for missing scopeId in path', () => {
      const executionId = 'test-exec-123';
      const stepId = 'test-step';
      const stackFrames: StackFrame[] = [
        {
          stepId: 'parent-step',
          nestedScopes: [{ nodeId: 'node1', nodeType: 'foreach' }], // no scopeId
        },
      ];

      // Calculate expected hash manually - should include empty string for missing scopeId
      const expectedInput = 'test-exec-123_parent-step__test-step';
      const expectedHash = crypto.createHash('sha256').update(expectedInput).digest('hex');

      const result = buildStepExecutionId(executionId, stepId, stackFrames);

      expect(result).toBe(expectedHash);
    });
  });

  describe('order sensitivity', () => {
    it('should generate different hashes when stack frame order changes', () => {
      const executionId = 'workflow-exec-abc123';
      const stepId = 'connector-send-email';

      const stackFrames1: StackFrame[] = [
        {
          stepId: 'step1',
          nestedScopes: [{ nodeId: 'node1', nodeType: 'foreach', scopeId: 'scope1' }],
        },
        {
          stepId: 'step2',
          nestedScopes: [{ nodeId: 'node2', nodeType: 'retry', scopeId: 'scope2' }],
        },
      ];

      const stackFrames2: StackFrame[] = [
        {
          stepId: 'step2',
          nestedScopes: [{ nodeId: 'node2', nodeType: 'retry', scopeId: 'scope2' }],
        },
        {
          stepId: 'step1',
          nestedScopes: [{ nodeId: 'node1', nodeType: 'foreach', scopeId: 'scope1' }],
        },
      ];

      const result1 = buildStepExecutionId(executionId, stepId, stackFrames1);
      const result2 = buildStepExecutionId(executionId, stepId, stackFrames2);

      expect(result1).not.toBe(result2);
    });

    it('should generate different hashes when nested scope order changes', () => {
      const executionId = 'workflow-exec-abc123';
      const stepId = 'connector-send-email';

      const stackFrames1: StackFrame[] = [
        {
          stepId: 'parent-step',
          nestedScopes: [
            { nodeId: 'node1', nodeType: 'foreach', scopeId: 'scope1' },
            { nodeId: 'node2', nodeType: 'retry', scopeId: 'scope2' },
          ],
        },
      ];

      const stackFrames2: StackFrame[] = [
        {
          stepId: 'parent-step',
          nestedScopes: [
            { nodeId: 'node2', nodeType: 'retry', scopeId: 'scope2' },
            { nodeId: 'node1', nodeType: 'foreach', scopeId: 'scope1' },
          ],
        },
      ];

      const result1 = buildStepExecutionId(executionId, stepId, stackFrames1);
      const result2 = buildStepExecutionId(executionId, stepId, stackFrames2);

      expect(result1).not.toBe(result2);
    });
  });
});
