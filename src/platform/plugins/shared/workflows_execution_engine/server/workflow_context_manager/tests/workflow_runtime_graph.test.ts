/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorStep, ForEachStep, WorkflowYaml } from '@kbn/workflows';
import type { ExitForeachNode } from '@kbn/workflows/graph';
import { WorkflowGraph } from '@kbn/workflows/graph';
import { WorkflowExecutionCursor } from '../workflow_execution_cursor';
import {
  ENTER_SYNTHETIC_PREFIX,
  EXIT_SYNTHETIC_PREFIX,
  WorkflowRuntimeGraph,
} from '../workflow_runtime_graph';

const SCOPE_HASH = /[0-9a-f]{16}$/;

const nestedForeachDefinition = {
  steps: [
    {
      name: 'outerLoop',
      foreach: '["a", "b"]',
      type: 'foreach',
      steps: [
        {
          name: 'innerLoop',
          foreach: '["x", "y"]',
          type: 'foreach',
          steps: [
            {
              name: 'deepAction',
              type: 'slack',
              connectorId: 'slack',
              with: { message: 'deep' },
            } as ConnectorStep,
          ],
        } as ForEachStep,
      ],
    } as ForEachStep,
  ],
} as Partial<WorkflowYaml>;

function createOverlay(): WorkflowRuntimeGraph {
  return new WorkflowRuntimeGraph(
    WorkflowGraph.fromWorkflowDefinition(nestedForeachDefinition as WorkflowYaml),
    []
  );
}

function hashedPair(stepId: string, enterId: string): { enterId: string; exitId: string } {
  expect(enterId).toMatch(new RegExp(`^${ENTER_SYNTHETIC_PREFIX}${stepId}_`));
  expect(enterId.split('_').pop()).toMatch(SCOPE_HASH);
  return {
    enterId,
    exitId: enterId.replace(/^enter/, 'exit'),
  };
}

describe('WorkflowRuntimeGraph synthetic scopes', () => {
  it('gives nested owners that both mint iteration 0 distinct hashed pair ids', () => {
    const overlay = createOverlay();

    const outerEnter = overlay.insertSyntheticScope('enterForeach_outerLoop', '0', 'iteration');
    const innerEnter = overlay.insertSyntheticScope('enterForeach_innerLoop', '0', 'iteration');

    const outer = hashedPair('0', outerEnter);
    const inner = hashedPair('0', innerEnter);

    expect(outer.enterId).not.toBe(inner.enterId);
    expect(overlay.getNode(outer.enterId)?.type).toBe('enter-iteration');
    expect(overlay.getNode(outer.exitId)?.type).toBe('exit-iteration');
    expect(overlay.getNode(inner.enterId)?.type).toBe('enter-iteration');
    expect(overlay.getNode(inner.exitId)?.type).toBe('exit-iteration');
  });

  it('throws when the same owner remints the same stepId', () => {
    const overlay = createOverlay();
    overlay.insertSyntheticScope('enterForeach_outerLoop', '0', 'iteration');

    expect(() => overlay.insertSyntheticScope('enterForeach_outerLoop', '0', 'iteration')).toThrow(
      'Synthetic scope 0 is already in the graph'
    );
  });

  it('omits the synthetic enter from getNodeStack when the cursor is on that enter', () => {
    const overlay = createOverlay();
    const enterId = overlay.insertSyntheticScope('enterForeach_outerLoop', '0', 'iteration');
    const stackNodeIds = overlay
      .getNodeStack(enterId)
      .flatMap((frame) => frame.nestedScopes.map((scope) => scope.nodeId));

    expect(stackNodeIds).toContain('enterForeach_outerLoop');
    expect(stackNodeIds).not.toContain(enterId);
  });

  it('hydrates a hashed enter when the stack is taken from a body node inside it', () => {
    const compiled = WorkflowGraph.fromWorkflowDefinition(nestedForeachDefinition as WorkflowYaml);
    const first = new WorkflowRuntimeGraph(compiled, []);
    const enterId = first.insertSyntheticScope('enterForeach_outerLoop', '0', 'iteration');
    const stack = first.getNodeStack('enterForeach_innerLoop');
    const stackNodeIds = stack.flatMap((frame) => frame.nestedScopes.map((scope) => scope.nodeId));

    expect(stackNodeIds).toContain(enterId);

    const hydrated = new WorkflowRuntimeGraph(compiled, stack);

    expect(hydrated.getNode(enterId)?.type).toBe('enter-iteration');
    expect(() => hydrated.insertSyntheticScope('enterForeach_outerLoop', '0', 'iteration')).toThrow(
      'Synthetic scope 0 is already in the graph'
    );
  });

  describe('wrap once, rename the pair', () => {
    it('topo-next after the first iteration exit is the owner exit', () => {
      const overlay = createOverlay();
      const enter0 = overlay.insertSyntheticScope('enterForeach_outerLoop', '0', 'iteration');
      const exit0 = enter0.replace(/^enter/, 'exit');
      const order = overlay.topologicalOrder;

      expect(order[order.indexOf(exit0) + 1]).toBe('exitForeach_outerLoop');
    });

    it('rewires the same pair when a later stepId is minted', () => {
      const compiledCount = createOverlay().topologicalOrder.length;
      const overlay = createOverlay();
      const enter0 = overlay.insertSyntheticScope('enterForeach_outerLoop', '0', 'iteration');
      const enter1 = overlay.insertSyntheticScope('enterForeach_outerLoop', '1', 'iteration');
      const exit1 = enter1.replace(/^enter/, 'exit');
      const order = overlay.topologicalOrder;

      expect(overlay.getNode(enter0)).toBeUndefined();
      expect(overlay.getNode(enter0.replace(/^enter/, 'exit'))).toBeUndefined();
      expect(overlay.getNode(enter1)?.stepType).toBe('iteration');
      expect(order).not.toContain(enter0);
      expect(order[order.indexOf(enter1) + 1]).not.toBe(exit1);
      expect(order[order.indexOf(exit1) + 1]).toBe('exitForeach_outerLoop');
      expect(order.length).toBe(compiledCount + 2);
    });

    it('does not clone the inner foreach when the outer pair is rewired', () => {
      const overlay = createOverlay();
      overlay.insertSyntheticScope('enterForeach_outerLoop', '0', 'iteration');
      overlay.insertSyntheticScope('enterForeach_outerLoop', '1', 'iteration');

      const innerEnter = overlay.getNode('enterForeach_innerLoop');
      const innerExit = overlay.getNode('exitForeach_innerLoop') as ExitForeachNode | undefined;
      const clonedInnerIds = overlay.topologicalOrder.filter(
        (id) => id.startsWith('enterForeach_innerLoop_') || id.startsWith('exitForeach_innerLoop_')
      );

      expect(clonedInnerIds).toEqual([]);
      expect(innerExit?.startNodeId).toBe('enterForeach_innerLoop');
      expect(innerEnter && 'exitNodeId' in innerEnter).toBe(true);
      if (innerEnter && 'exitNodeId' in innerEnter) {
        expect(innerEnter.exitNodeId).toBe('exitForeach_innerLoop');
      }
    });
  });
});

describe('WorkflowExecutionCursor synthetic commit', () => {
  it('navigates to the hashed enter id returned by the overlay', () => {
    const overlay = createOverlay();
    const cursor = new WorkflowExecutionCursor({
      nodeId: 'enterForeach_outerLoop',
      workflowExecutionGraph: overlay,
    });

    cursor.navigateToSynthetic({
      stepId: '0',
      stepType: 'iteration',
    });
    cursor.commitPendingNavigation();

    expect(cursor.currentNode?.id).toMatch(new RegExp(`^${ENTER_SYNTHETIC_PREFIX}0_`));
    expect(cursor.currentNode?.id).not.toBe('iteration:0');
    expect(cursor.currentNode?.id).not.toContain('iteration:0');
    expect(overlay.getNode(`${EXIT_SYNTHETIC_PREFIX}iteration:0`)).toBeUndefined();
  });
});
