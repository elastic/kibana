/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1".
 */

import { transformWorkflowToGraph } from '@kbn/workflows';
import type { WorkflowYaml } from '@kbn/workflows';
import { computeInsertionPoints } from './compute_insertion_points';

const wf = (steps: unknown[]): WorkflowYaml =>
  ({
    version: '1',
    name: 'wf',
    enabled: true,
    triggers: [{ type: 'manual' }],
    steps,
  } as unknown as WorkflowYaml);

describe('computeInsertionPoints', () => {
  it('maps trigger and step ports with name addressing (no fan-out)', () => {
    const workflow = wf([
      { name: 'a', type: 'console' },
      { name: 'b', type: 'console' },
    ]);
    const points = computeInsertionPoints(workflow, transformWorkflowToGraph(workflow));

    expect(points.topLevelStepNodeIds).toEqual(['a', 'b']);

    // Trigger port: no stepName (clicking it means prepend-step).
    const triggerId = [...points.byNodeId.keys()].find(
      (id) => !points.byNodeId.get(id)?.step?.stepName && !points.topLevelStepNodeIds.includes(id)
    );
    expect(triggerId).toBeDefined();
    expect(points.byNodeId.get(triggerId!)).toEqual({
      step: { sourceNodeId: triggerId, isTerminal: false },
    });

    // Step 'a': insert-after port, supports fallback.
    expect(points.byNodeId.get('a')).toEqual({
      step: { sourceNodeId: 'a', stepName: 'a', isTerminal: false },
      fallbackTarget: { stepName: 'a', nodeId: 'a' },
    });
    // Step 'b': last in sequence (isTerminal), supports fallback.
    expect(points.byNodeId.get('b')).toEqual({
      step: { sourceNodeId: 'b', stepName: 'b', isTerminal: true },
      fallbackTarget: { stepName: 'b', nodeId: 'b' },
    });
  });

  it('marks fallbackConnected when a fallback route already exists (no new port)', () => {
    const workflow = wf([
      { name: 'a', type: 'console', 'on-failure': { fallback: [{ name: 'fb', type: 'console' }] } },
    ]);
    const points = computeInsertionPoints(workflow, transformWorkflowToGraph(workflow));
    expect(points.byNodeId.get('a')?.fallbackTarget).toBeUndefined();
    expect(points.byNodeId.get('a')?.fallbackConnected).toBe(true);
    expect(points.byNodeId.get('a')?.step).toMatchObject({
      sourceNodeId: 'a',
      stepName: 'a',
      isTerminal: true,
    });
  });

  it('sets fallbackTarget when on-failure is retry/continue only (no fallback steps)', () => {
    const workflow = wf([
      {
        name: 'a',
        type: 'console',
        'on-failure': { retry: { 'max-attempts': 3 }, continue: true },
      },
    ]);
    const points = computeInsertionPoints(workflow, transformWorkflowToGraph(workflow));
    expect(points.byNodeId.get('a')?.fallbackTarget).toEqual({ stepName: 'a', nodeId: 'a' });
    expect(points.byNodeId.get('a')?.fallbackConnected).toBeUndefined();
  });

  it('recurses into a fallback lane so lane steps get their own ports (not a branch port on the owner)', () => {
    const workflow = wf([
      {
        name: 'a',
        type: 'console',
        'on-failure': {
          fallback: [
            {
              name: 'fb1',
              type: 'console',
              'on-failure': { fallback: [{ name: 'fb2', type: 'console' }] },
            },
            { name: 'fb3', type: 'console' },
          ],
        },
      },
    ]);
    const points = computeInsertionPoints(workflow, transformWorkflowToGraph(workflow));

    // Owner keeps its single flow port and fallbackConnected — no branches map.
    expect(points.byNodeId.get('a')?.branches).toBeUndefined();
    expect(points.byNodeId.get('a')?.fallbackConnected).toBe(true);
    expect(points.byNodeId.get('a')?.step).toMatchObject({
      sourceNodeId: 'a',
      stepName: 'a',
      isTerminal: true,
    });

    // fb1: not last in the lane, has its own fallback (fallbackConnected), own nested fallback target.
    expect(points.byNodeId.get('fb1')?.step).toMatchObject({
      sourceNodeId: 'fb1',
      stepName: 'fb1',
      isTerminal: false,
    });
    expect(points.byNodeId.get('fb1')?.fallbackConnected).toBe(true);

    // fb2: nested fallback leaf, gets its own fallbackTarget.
    expect(points.byNodeId.get('fb2')?.step).toMatchObject({
      sourceNodeId: 'fb2',
      stepName: 'fb2',
      isTerminal: true,
    });
    expect(points.byNodeId.get('fb2')?.fallbackTarget).toEqual({ stepName: 'fb2', nodeId: 'fb2' });

    // fb3: last in the lane, no fallback of its own — gets a fallbackTarget port.
    expect(points.byNodeId.get('fb3')?.step).toMatchObject({
      sourceNodeId: 'fb3',
      stepName: 'fb3',
      isTerminal: true,
    });
    expect(points.byNodeId.get('fb3')?.fallbackTarget).toEqual({ stepName: 'fb3', nodeId: 'fb3' });
  });

  it('gives if-nodes a branches map (then/else) keyed by slot', () => {
    const workflow = wf([
      {
        name: 'gate',
        type: 'if',
        condition: 'x',
        steps: [{ name: 'yes', type: 'console' }],
        else: [{ name: 'no', type: 'console' }],
      },
    ]);
    const points = computeInsertionPoints(workflow, transformWorkflowToGraph(workflow));
    const gatePorts = points.byNodeId.get('gate');
    expect(gatePorts?.branches).toBeDefined();
    // Last-in-sequence if-nodes get a step port for the "after block" terminal.
    expect(gatePorts?.step).toMatchObject({
      sourceNodeId: 'gate',
      stepName: 'gate',
      isTerminal: true,
    });
    // 'steps' key = if-node "then" branch; handle is 'then' in use_workflow_layout.
    expect(gatePorts?.branches?.get('steps')).toEqual({
      slot: { kind: 'steps' },
      ownerStepName: 'gate',
      isTerminal: false,
    });
    expect(gatePorts?.branches?.get('else')).toEqual({
      slot: { kind: 'else' },
      ownerStepName: 'gate',
      isTerminal: false,
    });
    // Branch leaves still have insert-after ports.
    expect(points.byNodeId.get('yes')?.step).toMatchObject({
      sourceNodeId: 'yes',
      stepName: 'yes',
      isTerminal: true,
    });
    expect(points.byNodeId.get('no')?.step).toMatchObject({
      sourceNodeId: 'no',
      stepName: 'no',
      isTerminal: true,
    });
  });

  it('gives foreach nodes a flow port but no branches.steps (empty body)', () => {
    const workflow = wf([{ name: 'loop', type: 'foreach' }]);
    const points = computeInsertionPoints(workflow, transformWorkflowToGraph(workflow));
    const loopPorts = points.byNodeId.get('loop');
    // 'steps' branch is filtered out — the container's own ⊕ button handles body insertion.
    expect(loopPorts?.branches).toBeUndefined();
    // Flow port for inserting after the container.
    expect(loopPorts?.step).toMatchObject({
      sourceNodeId: 'loop',
      stepName: 'loop',
      isTerminal: true,
    });
  });

  it('gives foreach nodes a flow port but no branches.steps (non-empty body), inner step keeps its port', () => {
    const workflow = wf([
      {
        name: 'loop',
        type: 'foreach',
        steps: [{ name: 'inner', type: 'console' }],
      },
      { name: 'after', type: 'console' },
    ]);
    const points = computeInsertionPoints(workflow, transformWorkflowToGraph(workflow));
    const loopPorts = points.byNodeId.get('loop');
    // 'steps' branch is filtered out — no spurious terminal stub below the container.
    expect(loopPorts?.branches).toBeUndefined();
    // Flow port: not terminal (followed by 'after').
    expect(loopPorts?.step).toMatchObject({
      sourceNodeId: 'loop',
      stepName: 'loop',
      isTerminal: false,
    });
    // Inner step keeps its flow port so its terminal stub (dashed line + ⊕) renders
    // inside the container body — increased WORKFLOW_COMPOUND_PADDING.bottom gives it room.
    expect(points.byNodeId.get('inner')?.step).toMatchObject({
      sourceNodeId: 'inner',
      stepName: 'inner',
      isTerminal: true,
    });
  });

  it('handles an empty workflow (trigger port only, isTerminal)', () => {
    const workflow = wf([]);
    const transformed = transformWorkflowToGraph(workflow);
    const points = computeInsertionPoints(workflow, transformed);
    expect(points.topLevelStepNodeIds).toEqual([]);
    const triggerPorts = [...points.byNodeId.values()];
    expect(triggerPorts).toHaveLength(1);
    // No stepName for a trigger port.
    expect(triggerPorts[0].step?.stepName).toBeUndefined();
    expect(triggerPorts[0].step?.isTerminal).toBe(true);
  });
});
