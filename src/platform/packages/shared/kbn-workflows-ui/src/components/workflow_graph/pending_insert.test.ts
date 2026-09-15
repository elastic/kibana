/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Node } from '@xyflow/react';
import { transformWorkflowToGraph } from '@kbn/workflows';
import type { WorkflowYaml } from '@kbn/workflows';
import { computeInsertionPoints } from './compute_insertion_points';
import { ERROR_PORT_INSET } from './port_geometry';
import {
  computePendingInsertConnector,
  computePendingInsertOrigin,
  PENDING_NODE_HEIGHT,
  PENDING_NODE_WIDTH,
} from './pending_insert';
import { WORKFLOW_NODE_SEP, WORKFLOW_RANK_SEP } from './workflow_layout_pipeline';

const wf = (steps: unknown[]): WorkflowYaml =>
  ({
    version: '1',
    name: 'wf',
    enabled: true,
    triggers: [{ type: 'manual' }],
    steps,
  } as unknown as WorkflowYaml);

const layoutNodes = (ids: Array<{ id: string; x: number; y: number; type?: string }>): Node[] =>
  ids.map(({ id, x, y, type }) => ({
    id,
    type: type ?? 'step',
    position: { x, y },
    width: PENDING_NODE_WIDTH,
    height: PENDING_NODE_HEIGHT,
    data: {},
  }));

describe('computePendingInsertOrigin', () => {
  it('places the card after the previous top-level step', () => {
    const workflow = wf([
      { name: 'a', type: 'console' },
      { name: 'b', type: 'console' },
    ]);
    const points = computeInsertionPoints(workflow, transformWorkflowToGraph(workflow));
    const nodes = layoutNodes([
      { id: 'manual', x: 0, y: 0, type: 'trigger' },
      { id: 'a', x: 0, y: 100 },
      { id: 'b', x: 0, y: 200 },
    ]);
    const origin = computePendingInsertOrigin({ mode: 'step', index: 1 }, nodes, points, 'TB');
    // Midpoint between a (y=100..164) and b (y=200..264), centered on a.
    expect(origin).toEqual({
      x: (0 + PENDING_NODE_WIDTH) / 2 - PENDING_NODE_WIDTH / 2,
      y: (164 + 200) / 2 - PENDING_NODE_HEIGHT / 2,
    });
  });

  it('places the card after the last step when appending', () => {
    const workflow = wf([{ name: 'a', type: 'console' }]);
    const points = computeInsertionPoints(workflow, transformWorkflowToGraph(workflow));
    const nodes = layoutNodes([
      { id: 'manual', x: 0, y: 0, type: 'trigger' },
      { id: 'a', x: 10, y: 80 },
    ]);
    const origin = computePendingInsertOrigin({ mode: 'step', index: 1 }, nodes, points, 'TB');
    expect(origin).toEqual({
      x: (10 + 10 + PENDING_NODE_WIDTH) / 2 - PENDING_NODE_WIDTH / 2,
      y: 80 + PENDING_NODE_HEIGHT + WORKFLOW_RANK_SEP,
    });
  });

  it('places an error-path card beside the owner, clear of the main column', () => {
    const workflow = wf([{ name: 'a', type: 'console' }]);
    const points = computeInsertionPoints(workflow, transformWorkflowToGraph(workflow));
    const nodes = layoutNodes([{ id: 'a', x: 20, y: 40 }]);
    const origin = computePendingInsertOrigin({ mode: 'error', stepId: 'a' }, nodes, points, 'TB');
    expect(origin).toEqual({
      x: 20 + PENDING_NODE_WIDTH + WORKFLOW_NODE_SEP,
      y: 40 + PENDING_NODE_HEIGHT + WORKFLOW_RANK_SEP,
    });
  });

  it('returns undefined on a truly empty canvas so the UI can center the draft', () => {
    const workflow = wf([]);
    const points = computeInsertionPoints(workflow, transformWorkflowToGraph(workflow));
    const origin = computePendingInsertOrigin(
      { mode: 'step', index: 0 },
      [],
      points,
      'TB'
    );
    expect(origin).toBeUndefined();
  });
});

describe('computePendingInsertConnector', () => {
  it('draws from the previous step into an append placeholder', () => {
    const workflow = wf([{ name: 'a', type: 'console' }]);
    const points = computeInsertionPoints(workflow, transformWorkflowToGraph(workflow));
    const nodes = layoutNodes([
      { id: 'manual', x: 0, y: 0, type: 'trigger' },
      { id: 'a', x: 10, y: 80 },
    ]);
    const context = { mode: 'step' as const, index: 1 };
    const origin = computePendingInsertOrigin(context, nodes, points, 'TB');
    expect(origin).toBeDefined();
    const connector = computePendingInsertConnector(context, origin!, nodes, points, 'TB');
    expect(connector).toEqual({
      sourceX: 10 + PENDING_NODE_WIDTH / 2,
      sourceY: 80 + PENDING_NODE_HEIGHT,
      targetX: origin!.x + PENDING_NODE_WIDTH / 2,
      targetY: origin!.y,
      isFailure: false,
    });
  });

  it('draws from the previous step into a mid-spine placeholder', () => {
    const workflow = wf([
      { name: 'a', type: 'console' },
      { name: 'b', type: 'console' },
    ]);
    const points = computeInsertionPoints(workflow, transformWorkflowToGraph(workflow));
    const nodes = layoutNodes([
      { id: 'manual', x: 0, y: 0, type: 'trigger' },
      { id: 'a', x: 0, y: 100 },
      { id: 'b', x: 0, y: 200 },
    ]);
    const context = { mode: 'step' as const, index: 1 };
    const origin = computePendingInsertOrigin(context, nodes, points, 'TB');
    const connector = computePendingInsertConnector(context, origin!, nodes, points, 'TB');
    expect(connector).toEqual({
      sourceX: PENDING_NODE_WIDTH / 2,
      sourceY: 100 + PENDING_NODE_HEIGHT,
      targetX: origin!.x + PENDING_NODE_WIDTH / 2,
      targetY: origin!.y,
      isFailure: false,
    });
  });

  it('marks an error-path connector as failure from the error port', () => {
    const workflow = wf([{ name: 'a', type: 'console' }]);
    const points = computeInsertionPoints(workflow, transformWorkflowToGraph(workflow));
    const nodes = layoutNodes([{ id: 'a', x: 20, y: 40 }]);
    const context = { mode: 'error' as const, stepId: 'a' };
    const origin = computePendingInsertOrigin(context, nodes, points, 'TB');
    expect(origin).toEqual({
      x: 20 + PENDING_NODE_WIDTH + WORKFLOW_NODE_SEP,
      y: 40 + PENDING_NODE_HEIGHT + WORKFLOW_RANK_SEP,
    });
    const connector = computePendingInsertConnector(context, origin!, nodes, points, 'TB');
    expect(connector).toMatchObject({
      sourceX: 20 + PENDING_NODE_WIDTH - ERROR_PORT_INSET,
      sourceY: 40 + PENDING_NODE_HEIGHT,
      targetX: origin!.x + PENDING_NODE_WIDTH / 2,
      targetY: origin!.y,
      isFailure: true,
    });
  });

  it('LR: hangs the error placeholder one lane below and one column right', () => {
    const workflow = wf([{ name: 'a', type: 'console' }]);
    const points = computeInsertionPoints(workflow, transformWorkflowToGraph(workflow));
    const nodes = layoutNodes([{ id: 'a', x: 20, y: 40 }]);
    const context = { mode: 'error' as const, stepId: 'a' };
    const origin = computePendingInsertOrigin(context, nodes, points, 'LR');
    expect(origin).toEqual({
      x: 20 + PENDING_NODE_WIDTH + WORKFLOW_RANK_SEP,
      y: 40 + PENDING_NODE_HEIGHT + WORKFLOW_NODE_SEP,
    });
    const connector = computePendingInsertConnector(context, origin!, nodes, points, 'LR');
    expect(connector).toEqual({
      sourceX: 20 + PENDING_NODE_WIDTH - ERROR_PORT_INSET,
      sourceY: 40 + PENDING_NODE_HEIGHT,
      targetX: origin!.x,
      targetY: origin!.y + PENDING_NODE_HEIGHT / 2,
      isFailure: true,
    });
  });
});
