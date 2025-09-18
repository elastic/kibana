/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StackFrame } from '@kbn/workflows';
import { WorkflowScopeStack, type EnterScopeData } from '../workflow_call_stack';

describe('WorkflowScopeStack', () => {
  const createMockEnterScopeData = (
    nodeId: string,
    stepId: string,
    nodeType: string = 'atomic',
    scopeId?: string
  ): EnterScopeData => ({
    nodeId,
    stepId,
    nodeType,
    scopeId,
  });

  const createMockStackFrame = (
    stepId: string,
    scopes: Array<{ nodeId: string; nodeType: string; scopeId?: string }>
  ): StackFrame => ({
    stepId,
    nestedScopes: scopes.map((scope) => ({
      nodeId: scope.nodeId,
      nodeType: scope.nodeType,
      scopeId: scope.scopeId,
    })),
  });

  describe('constructor and static methods', () => {
    it('should create an empty WorkflowScopeStack', () => {
      const stack = new WorkflowScopeStack();
      expect(stack.stackFrames).toEqual([]);
    });

    it('should create WorkflowScopeStack from existing frames using fromStackFrames', () => {
      const frames: StackFrame[] = [
        createMockStackFrame('step1', [{ nodeId: 'node1', nodeType: 'atomic' }]),
        createMockStackFrame('step2', [{ nodeId: 'node2', nodeType: 'atomic' }]),
      ];

      const stack = WorkflowScopeStack.fromStackFrames(frames);
      expect(stack.stackFrames).toEqual(frames);
    });

    it('should create deep copies of frames to ensure immutability', () => {
      const frames: StackFrame[] = [
        createMockStackFrame('step1', [{ nodeId: 'node1', nodeType: 'atomic' }]),
      ];

      const stack = WorkflowScopeStack.fromStackFrames(frames);
      
      // Modify the original frames
      frames[0].stepId = 'modified';
      frames[0].nestedScopes[0].nodeId = 'modified';

      // Stack should remain unchanged
      expect(stack.stackFrames[0].stepId).toBe('step1');
      expect(stack.stackFrames[0].nestedScopes[0].nodeId).toBe('node1');
    });
  });

  describe('stackFrames getter', () => {
    it('should return deep copies to prevent external mutation', () => {
      const stack = WorkflowScopeStack.fromStackFrames([
        createMockStackFrame('step1', [{ nodeId: 'node1', nodeType: 'atomic' }]),
      ]);

      const frames = stack.stackFrames;
      frames[0].stepId = 'modified';
      frames[0].nestedScopes[0].nodeId = 'modified';

      // Original stack should remain unchanged
      expect(stack.stackFrames[0].stepId).toBe('step1');
      expect(stack.stackFrames[0].nestedScopes[0].nodeId).toBe('node1');
    });
  });

  describe('enterScope', () => {
    it('should create a new frame for a new step', () => {
      const stack = new WorkflowScopeStack();
      const enterData = createMockEnterScopeData('node1', 'step1', 'atomic', 'scope1');

      const newStack = stack.enterScope(enterData);

      expect(newStack.stackFrames).toHaveLength(1);
      expect(newStack.stackFrames[0]).toEqual({
        stepId: 'step1',
        nestedScopes: [
          {
            nodeId: 'node1',
            nodeType: 'atomic',
            scopeId: 'scope1',
          },
        ],
      });
    });

    it('should add nested scope to existing frame for same step', () => {
      const initialFrames = [
        createMockStackFrame('step1', [{ nodeId: 'node1', nodeType: 'atomic', scopeId: 'scope1' }]),
      ];
      const stack = WorkflowScopeStack.fromStackFrames(initialFrames);
      const enterData = createMockEnterScopeData('node2', 'step1', 'atomic', 'scope2');

      const newStack = stack.enterScope(enterData);

      expect(newStack.stackFrames).toHaveLength(1);
      expect(newStack.stackFrames[0].nestedScopes).toHaveLength(2);
      expect(newStack.stackFrames[0].nestedScopes[1]).toEqual({
        nodeId: 'node2',
        nodeType: 'atomic',
        scopeId: 'scope2',
      });
    });

    it('should create new frame for different step', () => {
      const initialFrames = [
        createMockStackFrame('step1', [{ nodeId: 'node1', nodeType: 'atomic' }]),
      ];
      const stack = WorkflowScopeStack.fromStackFrames(initialFrames);
      const enterData = createMockEnterScopeData('node2', 'step2', 'atomic');

      const newStack = stack.enterScope(enterData);

      expect(newStack.stackFrames).toHaveLength(2);
      expect(newStack.stackFrames[1]).toEqual({
        stepId: 'step2',
        nestedScopes: [
          {
            nodeId: 'node2',
            nodeType: 'atomic',
            scopeId: undefined,
          },
        ],
      });
    });

    it('should work without scopeId', () => {
      const stack = new WorkflowScopeStack();
      const enterData = createMockEnterScopeData('node1', 'step1', 'atomic');

      const newStack = stack.enterScope(enterData);

      expect(newStack.stackFrames[0].nestedScopes[0].scopeId).toBeUndefined();
    });

    it('should preserve node type from enter scope data', () => {
      const stack = new WorkflowScopeStack();
      const enterData = createMockEnterScopeData('node1', 'step1', 'http');

      const newStack = stack.enterScope(enterData);

      expect(newStack.stackFrames[0].nestedScopes[0].nodeType).toBe('http');
    });

    it('should return new instance and preserve original immutability', () => {
      const stack = new WorkflowScopeStack();
      const enterData = createMockEnterScopeData('node1', 'step1', 'atomic');

      const newStack = stack.enterScope(enterData);

      expect(newStack).not.toBe(stack);
      expect(stack.stackFrames).toHaveLength(0);
      expect(newStack.stackFrames).toHaveLength(1);
    });
  });

  describe('exitScope', () => {
    it('should remove the most recent nested scope from frame with multiple scopes', () => {
      const initialFrames = [
        createMockStackFrame('step1', [
          { nodeId: 'node1', nodeType: 'atomic', scopeId: 'scope1' },
          { nodeId: 'node2', nodeType: 'atomic', scopeId: 'scope2' },
        ]),
      ];
      const stack = WorkflowScopeStack.fromStackFrames(initialFrames);

      const newStack = stack.exitScope();

      expect(newStack.stackFrames).toHaveLength(1);
      expect(newStack.stackFrames[0].nestedScopes).toHaveLength(1);
      expect(newStack.stackFrames[0].nestedScopes[0]).toEqual({
        nodeId: 'node1',
        nodeType: 'atomic',
        scopeId: 'scope1',
      });
    });

    it('should remove entire frame when only one scope remains', () => {
      const initialFrames = [
        createMockStackFrame('step1', [{ nodeId: 'node1', nodeType: 'atomic' }]),
      ];
      const stack = WorkflowScopeStack.fromStackFrames(initialFrames);

      const newStack = stack.exitScope();

      expect(newStack.stackFrames).toHaveLength(0);
    });

    it('should handle empty stack gracefully', () => {
      const stack = new WorkflowScopeStack();

      const newStack = stack.exitScope();

      expect(newStack.stackFrames).toHaveLength(0);
    });

    it('should return new instance and preserve original immutability', () => {
      const initialFrames = [
        createMockStackFrame('step1', [{ nodeId: 'node1', nodeType: 'atomic' }]),
      ];
      const stack = WorkflowScopeStack.fromStackFrames(initialFrames);

      const newStack = stack.exitScope();

      expect(newStack).not.toBe(stack);
      expect(stack.stackFrames).toHaveLength(1);
      expect(newStack.stackFrames).toHaveLength(0);
    });
  });

  describe('complex scenarios', () => {
    it('should handle multiple nested steps correctly', () => {
      let stack = new WorkflowScopeStack();

      // Enter step1
      const enterData1 = createMockEnterScopeData('node1', 'step1', 'atomic', 'scope1');
      stack = stack.enterScope(enterData1);

      // Enter step2
      const enterData2 = createMockEnterScopeData('node2', 'step2', 'http', 'scope2');
      stack = stack.enterScope(enterData2);

      // Enter another scope in step2
      const enterData3 = createMockEnterScopeData('node3', 'step2', 'wait', 'scope3');
      stack = stack.enterScope(enterData3);

      expect(stack.stackFrames).toHaveLength(2);
      expect(stack.stackFrames[0].stepId).toBe('step1');
      expect(stack.stackFrames[0].nestedScopes).toHaveLength(1);
      expect(stack.stackFrames[1].stepId).toBe('step2');
      expect(stack.stackFrames[1].nestedScopes).toHaveLength(2);

      // Exit scope3 from step2
      stack = stack.exitScope();
      expect(stack.stackFrames).toHaveLength(2);
      expect(stack.stackFrames[1].nestedScopes).toHaveLength(1);

      // Exit scope2 from step2
      stack = stack.exitScope();
      expect(stack.stackFrames).toHaveLength(1);
      expect(stack.stackFrames[0].stepId).toBe('step1');

      // Exit scope1 from step1
      stack = stack.exitScope();
      expect(stack.stackFrames).toHaveLength(0);
    });

    it('should maintain proper LIFO (Last In, First Out) behavior', () => {
      let stack = new WorkflowScopeStack();

      // Build a complex stack
      const enterDataList = [
        createMockEnterScopeData('node1', 'step1', 'atomic', 'scope1'),
        createMockEnterScopeData('node2', 'step1', 'http', 'scope2'),
        createMockEnterScopeData('node3', 'step2', 'wait', 'scope3'),
        createMockEnterScopeData('node4', 'step2', 'atomic', 'scope4'),
      ];

      enterDataList.forEach((enterData) => {
        stack = stack.enterScope(enterData);
      });

      expect(stack.stackFrames).toHaveLength(2);
      expect(stack.stackFrames[0].nestedScopes).toHaveLength(2);
      expect(stack.stackFrames[1].nestedScopes).toHaveLength(2);

      // Exit in LIFO order
      stack = stack.exitScope(); // Remove scope4 from step2
      expect(stack.stackFrames[1].nestedScopes).toHaveLength(1);
      expect(stack.stackFrames[1].nestedScopes[0].scopeId).toBe('scope3');

      stack = stack.exitScope(); // Remove step2 entirely
      expect(stack.stackFrames).toHaveLength(1);
      expect(stack.stackFrames[0].stepId).toBe('step1');
    });

    it('should handle scope tracking with different node types', () => {
      let stack = new WorkflowScopeStack();

      const httpData = createMockEnterScopeData('http1', 'step1', 'http');
      const waitData = createMockEnterScopeData('wait1', 'step1', 'wait');
      const atomicData = createMockEnterScopeData('atomic1', 'step2', 'atomic');

      stack = stack.enterScope(httpData);
      stack = stack.enterScope(waitData);
      stack = stack.enterScope(atomicData);

      expect(stack.stackFrames).toHaveLength(2);
      expect(stack.stackFrames[0].nestedScopes[0].nodeType).toBe('http');
      expect(stack.stackFrames[0].nestedScopes[1].nodeType).toBe('wait');
      expect(stack.stackFrames[1].nestedScopes[0].nodeType).toBe('atomic');
    });
  });

  describe('immutability verification', () => {
    it('should ensure all operations create new instances', () => {
      const originalStack = new WorkflowScopeStack();
      const enterData = createMockEnterScopeData('node1', 'step1', 'atomic');

      const afterEnter = originalStack.enterScope(enterData);
      const afterExit = afterEnter.exitScope();

      // All instances should be different
      expect(afterEnter).not.toBe(originalStack);
      expect(afterExit).not.toBe(afterEnter);
      expect(afterExit).not.toBe(originalStack);

      // Original should remain unchanged
      expect(originalStack.stackFrames).toHaveLength(0);
    });

    it('should ensure deep immutability of nested structures', () => {
      const stack = new WorkflowScopeStack();
      const enterData = createMockEnterScopeData('node1', 'step1', 'atomic', 'scope1');

      const newStack = stack.enterScope(enterData);
      const frames = newStack.stackFrames;

      // Attempt to modify returned frames
      frames[0].stepId = 'modified';
      frames[0].nestedScopes[0].nodeId = 'modified';
      frames[0].nestedScopes[0].scopeId = 'modified';

      // Original stack should remain unchanged
      const originalFrames = newStack.stackFrames;
      expect(originalFrames[0].stepId).toBe('step1');
      expect(originalFrames[0].nestedScopes[0].nodeId).toBe('node1');
      expect(originalFrames[0].nestedScopes[0].scopeId).toBe('scope1');
    });
  });

  describe('EnterScopeData interface', () => {
    it('should handle EnterScopeData with all properties', () => {
      const stack = new WorkflowScopeStack();
      const enterData: EnterScopeData = {
        nodeId: 'test-node',
        stepId: 'test-step',
        nodeType: 'elasticsearch',
        scopeId: 'test-scope',
      };

      const newStack = stack.enterScope(enterData);

      expect(newStack.stackFrames[0].nestedScopes[0]).toEqual({
        nodeId: 'test-node',
        nodeType: 'elasticsearch',
        scopeId: 'test-scope',
      });
    });

    it('should handle EnterScopeData without optional scopeId', () => {
      const stack = new WorkflowScopeStack();
      const enterData: EnterScopeData = {
        nodeId: 'test-node',
        stepId: 'test-step',
        nodeType: 'kibana',
      };

      const newStack = stack.enterScope(enterData);

      expect(newStack.stackFrames[0].nestedScopes[0]).toEqual({
        nodeId: 'test-node',
        nodeType: 'kibana',
        scopeId: undefined,
      });
    });
  });
});