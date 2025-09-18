/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StackFrame } from '@kbn/workflows';
import { buildStepPath } from './build_step_path';

describe('buildStepPath', () => {
  describe('basic functionality', () => {
    it('should return empty array when stack is empty', () => {
      const result = buildStepPath('current-step', []);
      expect(result).toEqual([]);
    });

    it('should return path from single stack entry without subScopeId', () => {
      const stack: StackFrame[] = [{ nodeId: 'node-1', stepId: 'parent-step' }];
      const result = buildStepPath('current-step', stack);
      expect(result).toEqual(['parent-step']);
    });

    it('should return path from single stack entry with subScopeId', () => {
      const stack: StackFrame[] = [{ nodeId: 'node-1', stepId: 'foreach-step', subScopeId: '1' }];
      const result = buildStepPath('current-step', stack);
      expect(result).toEqual(['foreach-step', '1']);
    });

    it('should return path from multiple stack entries', () => {
      const stack: StackFrame[] = [
        { nodeId: 'node-1', stepId: 'parent-step' },
        { nodeId: 'node-2', stepId: 'child-step', subScopeId: '2' },
        { nodeId: 'node-3', stepId: 'grandchild-step' },
      ];
      const result = buildStepPath('current-step', stack);
      expect(result).toEqual(['parent-step', 'child-step', '2', 'grandchild-step']);
    });
  });

  describe('duplicate step ID handling', () => {
    it('should deduplicate consecutive step IDs without subScopeId', () => {
      const stack: StackFrame[] = [
        { nodeId: 'node-1', stepId: 'step-a' },
        { nodeId: 'node-2', stepId: 'step-a' }, // duplicate
        { nodeId: 'node-3', stepId: 'step-b' },
      ];
      const result = buildStepPath('current-step', stack);
      expect(result).toEqual(['step-a', 'step-b']);
    });

    it('should not deduplicate consecutive step IDs when they have subScopeId', () => {
      const stack: StackFrame[] = [
        { nodeId: 'node-1', stepId: 'step-a', subScopeId: '1' },
        { nodeId: 'node-2', stepId: 'step-a', subScopeId: '2' }, // different subScopeId
        { nodeId: 'node-3', stepId: 'step-b' },
      ];
      const result = buildStepPath('current-step', stack);
      expect(result).toEqual(['step-a', '1', 'step-a', '2', 'step-b']);
    });

    it('should handle non-consecutive duplicate step IDs', () => {
      const stack: StackFrame[] = [
        { nodeId: 'node-1', stepId: 'step-a' },
        { nodeId: 'node-2', stepId: 'step-b' },
        { nodeId: 'node-3', stepId: 'step-a' }, // non-consecutive duplicate
      ];
      const result = buildStepPath('current-step', stack);
      expect(result).toEqual(['step-a', 'step-b', 'step-a']);
    });
  });

  describe('last stack entry optimization', () => {
    it('should remove last stack entry if stepId matches current stepId and no subScopeId', () => {
      const currentStepId = 'current-step';
      const stack: StackFrame[] = [
        { nodeId: 'node-1', stepId: 'parent-step' },
        { nodeId: 'node-2', stepId: currentStepId }, // should be removed
      ];
      const result = buildStepPath(currentStepId, stack);
      expect(result).toEqual(['parent-step']);
    });

    it('should not remove last stack entry if stepId matches but has subScopeId', () => {
      const currentStepId = 'current-step';
      const stack: StackFrame[] = [
        { nodeId: 'node-1', stepId: 'parent-step' },
        { nodeId: 'node-2', stepId: currentStepId, subScopeId: '1' }, // should not be removed
      ];
      const result = buildStepPath(currentStepId, stack);
      expect(result).toEqual(['parent-step', currentStepId, '1']);
    });

    it('should not remove last stack entry if stepId does not match', () => {
      const currentStepId = 'current-step';
      const stack: StackFrame[] = [
        { nodeId: 'node-1', stepId: 'parent-step' },
        { nodeId: 'node-2', stepId: 'different-step' }, // should not be removed
      ];
      const result = buildStepPath(currentStepId, stack);
      expect(result).toEqual(['parent-step', 'different-step']);
    });

    it('should handle empty stack after removing last entry', () => {
      const currentStepId = 'current-step';
      const stack: StackFrame[] = [
        { nodeId: 'node-1', stepId: currentStepId }, // should be removed, leaving empty stack
      ];
      const result = buildStepPath(currentStepId, stack);
      expect(result).toEqual([]);
    });
  });

  describe('complex workflow scenarios', () => {
    it('should handle nested foreach loops', () => {
      const stack: StackFrame[] = [
        { nodeId: 'node-1', stepId: 'outer-foreach', subScopeId: '0' },
        { nodeId: 'node-2', stepId: 'middle-foreach', subScopeId: '1' },
        { nodeId: 'node-3', stepId: 'inner-foreach', subScopeId: '2' },
      ];
      const result = buildStepPath('current-step', stack);
      expect(result).toEqual(['outer-foreach', '0', 'middle-foreach', '1', 'inner-foreach', '2']);
    });

    it('should handle nested if conditions', () => {
      const stack: StackFrame[] = [
        { nodeId: 'node-1', stepId: 'outer-if' },
        { nodeId: 'node-2', stepId: 'inner-if' },
        { nodeId: 'node-3', stepId: 'nested-if' },
      ];
      const result = buildStepPath('current-step', stack);
      expect(result).toEqual(['outer-if', 'inner-if', 'nested-if']);
    });

    it('should handle mixed nested constructs', () => {
      const stack: StackFrame[] = [
        { nodeId: 'node-1', stepId: 'foreach-step', subScopeId: '0' },
        { nodeId: 'node-2', stepId: 'if-step' },
        { nodeId: 'node-3', stepId: 'retry-step', subScopeId: 'attempt-1' },
        { nodeId: 'node-4', stepId: 'nested-foreach', subScopeId: '3' },
      ];
      const result = buildStepPath('current-step', stack);
      expect(result).toEqual([
        'foreach-step',
        '0',
        'if-step',
        'retry-step',
        'attempt-1',
        'nested-foreach',
        '3',
      ]);
    });

    it('should handle fallback and continue scenarios', () => {
      const stack: StackFrame[] = [
        { nodeId: 'node-1', stepId: 'main-step' },
        { nodeId: 'node-2', stepId: 'fallback-step', subScopeId: 'fallback' },
        { nodeId: 'node-3', stepId: 'continue-step', subScopeId: 'continue' },
      ];
      const result = buildStepPath('current-step', stack);
      expect(result).toEqual([
        'main-step',
        'fallback-step',
        'fallback',
        'continue-step',
        'continue',
      ]);
    });
  });

  describe('immutability', () => {
    it('should not modify the original stack array', () => {
      const originalStack: StackFrame[] = [
        { nodeId: 'node-1', stepId: 'step-a' },
        { nodeId: 'node-2', stepId: 'step-b', subScopeId: '1' },
      ];
      const stackCopy = [...originalStack];

      buildStepPath('current-step', originalStack);

      expect(originalStack).toEqual(stackCopy);
    });

    it('should not modify original stack when removing last entry', () => {
      const currentStepId = 'current-step';
      const originalStack: StackFrame[] = [
        { nodeId: 'node-1', stepId: 'parent-step' },
        { nodeId: 'node-2', stepId: currentStepId },
      ];
      const stackCopy = [...originalStack];

      buildStepPath(currentStepId, originalStack);

      expect(originalStack).toEqual(stackCopy);
      expect(originalStack.length).toBe(2); // Should still have original length
    });
  });

  describe('edge cases', () => {
    it('should handle empty stepId', () => {
      const stack: StackFrame[] = [
        { nodeId: 'node-1', stepId: '' },
        { nodeId: 'node-2', stepId: 'valid-step' },
      ];
      const result = buildStepPath('current-step', stack);
      expect(result).toEqual(['', 'valid-step']);
    });

    it('should handle empty subScopeId', () => {
      const stack: StackFrame[] = [
        { nodeId: 'node-1', stepId: 'step-a', subScopeId: '' },
        { nodeId: 'node-2', stepId: 'step-b' },
      ];
      const result = buildStepPath('current-step', stack);
      expect(result).toEqual(['step-a', '', 'step-b']);
    });

    it('should handle special characters in stepId and subScopeId', () => {
      const stack: StackFrame[] = [
        {
          nodeId: 'node-1',
          stepId: 'step@with-special#chars',
          subScopeId: 'scope!with_special$chars',
        },
        { nodeId: 'node-2', stepId: 'normal-step' },
      ];
      const result = buildStepPath('current-step', stack);
      expect(result).toEqual([
        'step@with-special#chars',
        'scope!with_special$chars',
        'normal-step',
      ]);
    });

    it('should handle very long stepId and subScopeId', () => {
      const longStepId = 'a'.repeat(1000);
      const longSubScopeId = 'b'.repeat(1000);
      const stack: StackFrame[] = [
        { nodeId: 'node-1', stepId: longStepId, subScopeId: longSubScopeId },
      ];
      const result = buildStepPath('current-step', stack);
      expect(result).toEqual([longStepId, longSubScopeId]);
    });
  });

  describe('deterministic behavior', () => {
    it('should produce consistent results for identical inputs', () => {
      const stack: StackFrame[] = [
        { nodeId: 'node-1', stepId: 'foreach-step', subScopeId: '1' },
        { nodeId: 'node-2', stepId: 'if-step' },
        { nodeId: 'node-3', stepId: 'connector-step', subScopeId: '2' },
      ];

      const result1 = buildStepPath('current-step', stack);
      const result2 = buildStepPath('current-step', stack);

      expect(result1).toEqual(result2);
      expect(result1).toEqual(['foreach-step', '1', 'if-step', 'connector-step', '2']);
    });

    it('should produce different results for different stack orders', () => {
      const stack1: StackFrame[] = [
        { nodeId: 'node-1', stepId: 'step-a', subScopeId: '1' },
        { nodeId: 'node-2', stepId: 'step-b', subScopeId: '2' },
      ];
      const stack2: StackFrame[] = [
        { nodeId: 'node-1', stepId: 'step-b', subScopeId: '2' },
        { nodeId: 'node-2', stepId: 'step-a', subScopeId: '1' },
      ];

      const result1 = buildStepPath('current-step', stack1);
      const result2 = buildStepPath('current-step', stack2);

      expect(result1).not.toEqual(result2);
      expect(result1).toEqual(['step-a', '1', 'step-b', '2']);
      expect(result2).toEqual(['step-b', '2', 'step-a', '1']);
    });
  });

  describe('realistic workflow examples', () => {
    it('should handle a realistic security workflow path', () => {
      const stack: StackFrame[] = [
        { nodeId: 'enter_main_workflow', stepId: 'main-security-workflow' },
        {
          nodeId: 'enter_incident_response',
          stepId: 'incident-response-foreach',
          subScopeId: 'alert-1',
        },
        { nodeId: 'enter_threat_analysis', stepId: 'threat-analysis-if' },
        { nodeId: 'enter_then_branch', stepId: 'escalation-retry', subScopeId: 'attempt-2' },
      ];

      const result = buildStepPath('send-slack-notification', stack);

      expect(result).toEqual([
        'main-security-workflow',
        'incident-response-foreach',
        'alert-1',
        'threat-analysis-if',
        'escalation-retry',
        'attempt-2',
      ]);
    });

    it('should handle a realistic data processing workflow path', () => {
      const stack: StackFrame[] = [
        { nodeId: 'enter_data_pipeline', stepId: 'data-ingestion-pipeline' },
        {
          nodeId: 'enter_validation_loop',
          stepId: 'data-validation-foreach',
          subScopeId: 'batch-5',
        },
        { nodeId: 'enter_transformation', stepId: 'transform-data-if' },
        { nodeId: 'enter_fallback', stepId: 'error-handling-fallback', subScopeId: 'fallback' },
      ];

      const result = buildStepPath('log-processing-error', stack);

      expect(result).toEqual([
        'data-ingestion-pipeline',
        'data-validation-foreach',
        'batch-5',
        'transform-data-if',
        'error-handling-fallback',
        'fallback',
      ]);
    });
  });
});
