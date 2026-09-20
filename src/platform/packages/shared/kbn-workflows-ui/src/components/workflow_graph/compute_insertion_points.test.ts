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
  it('maps trigger and step ports to insert-after targets (no fan-out)', () => {
    const workflow = wf([
      { name: 'a', type: 'console' },
      { name: 'b', type: 'console' },
    ]);
    const points = computeInsertionPoints(workflow, transformWorkflowToGraph(workflow));

    expect(points.topLevelStepNodeIds).toEqual(['a', 'b']);
    const triggerId = [...points.byNodeId.keys()].find((id) =>
      points.byNodeId.get(id)?.step?.index === 0 && !points.topLevelStepNodeIds.includes(id)
    );
    expect(triggerId).toBeDefined();
    expect(points.byNodeId.get(triggerId!)).toEqual({
      step: { index: 0, sourceNodeId: triggerId },
    });
    expect(points.byNodeId.get('a')).toEqual({
      step: { index: 1, sourceNodeId: 'a' },
      errorStepId: 'a',
    });
    expect(points.byNodeId.get('b')).toEqual({
      step: { index: 2, sourceNodeId: 'b' },
      errorStepId: 'b',
    });
  });

  it('keeps a connected error port (non-insert) when on-failure already exists', () => {
    const workflow = wf([
      { name: 'a', type: 'console', 'on-failure': { fallback: [{ name: 'fb', type: 'console' }] } },
    ]);
    const points = computeInsertionPoints(workflow, transformWorkflowToGraph(workflow));
    expect(points.byNodeId.get('a')?.errorStepId).toBeUndefined();
    expect(points.byNodeId.get('a')?.errorConnected).toBe(true);
    expect(points.byNodeId.get('a')?.step).toEqual({ index: 1, sourceNodeId: 'a' });
  });

  it('gives if-nodes then/else ports only (error port deferred — TODO(engine))', () => {
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
    expect(points.byNodeId.get('gate')).toEqual({
      then: {
        index: 0,
        path: [{ stepIndex: 0, branch: 'steps' }],
        sourceNodeId: 'gate',
      },
      else: {
        index: 0,
        path: [{ stepIndex: 0, branch: 'else' }],
        sourceNodeId: 'gate',
      },
    });
    // Branch leaves still have insert-after ports in their sequences.
    expect(points.byNodeId.get('yes')?.step).toEqual({
      index: 1,
      path: [{ stepIndex: 0, branch: 'steps' }],
      sourceNodeId: 'yes',
    });
    expect(points.byNodeId.get('no')?.step).toEqual({
      index: 1,
      path: [{ stepIndex: 0, branch: 'else' }],
      sourceNodeId: 'no',
    });
  });

  it('handles an empty workflow (trigger port only)', () => {
    const workflow = wf([]);
    const transformed = transformWorkflowToGraph(workflow);
    const points = computeInsertionPoints(workflow, transformed);
    expect(points.topLevelStepNodeIds).toEqual([]);
    const triggerPorts = [...points.byNodeId.values()];
    expect(triggerPorts).toHaveLength(1);
    expect(triggerPorts[0].step?.index).toBe(0);
  });
});
