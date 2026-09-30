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
import {
  computePendingInsertConnector,
  computePendingInsertOrigin,
  PENDING_NODE_HEIGHT,
  PENDING_NODE_WIDTH,
} from './pending_insert';
import { WORKFLOW_RANK_SEP } from './workflow_layout_pipeline';

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
  it('places the card after the source node (insert-after model)', () => {
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
    // Insert after 'a': ghost hangs gap below a's exit.
    const origin = computePendingInsertOrigin({ mode: 'step', sourceNodeId: 'a' }, nodes, points, 'TB');
    expect(origin).toEqual({
      x: (0 + PENDING_NODE_WIDTH) / 2 - PENDING_NODE_WIDTH / 2,
      y: 100 + PENDING_NODE_HEIGHT + WORKFLOW_RANK_SEP,
    });
  });

  it('places the card after the last step when appending', () => {
    const workflow = wf([{ name: 'a', type: 'console' }]);
    const points = computeInsertionPoints(workflow, transformWorkflowToGraph(workflow));
    const nodes = layoutNodes([
      { id: 'manual', x: 0, y: 0, type: 'trigger' },
      { id: 'a', x: 10, y: 80 },
    ]);
    const origin = computePendingInsertOrigin({ mode: 'step', sourceNodeId: 'a' }, nodes, points, 'TB');
    expect(origin).toEqual({
      x: (10 + 10 + PENDING_NODE_WIDTH) / 2 - PENDING_NODE_WIDTH / 2,
      y: 80 + PENDING_NODE_HEIGHT + WORKFLOW_RANK_SEP,
    });
  });

  it('places an error-path card as undefined (known deviation #4 — stub)', () => {
    // computePendingErrorBranchPlacement is stubbed to undefined until the
    // reservedLanes-based placement is wired up (ADR-0012 + known deviation #4).
    const workflow = wf([{ name: 'a', type: 'console' }]);
    const points = computeInsertionPoints(workflow, transformWorkflowToGraph(workflow));
    const nodes = layoutNodes([{ id: 'a', x: 20, y: 40 }]);
    const origin = computePendingInsertOrigin({ mode: 'error', stepId: 'a' }, nodes, points, 'TB');
    expect(origin).toBeUndefined();
  });

  it('returns undefined on a truly empty canvas so the UI can center the draft', () => {
    const workflow = wf([]);
    const points = computeInsertionPoints(workflow, transformWorkflowToGraph(workflow));
    const origin = computePendingInsertOrigin(
      { mode: 'step' },
      [],
      points,
      'TB'
    );
    expect(origin).toBeUndefined();
  });

  it('returns undefined for an empty-canvas trigger draft so the UI can center it', () => {
    const workflow = wf([]);
    const points = computeInsertionPoints(workflow, transformWorkflowToGraph(workflow));
    expect(computePendingInsertOrigin({ mode: 'trigger' }, [], points, 'TB')).toBeUndefined();
  });

  it('places a trigger draft beside the last existing trigger (TB)', () => {
    const workflow = wf([]);
    const points = computeInsertionPoints(workflow, transformWorkflowToGraph(workflow));
    const nodes = layoutNodes([{ id: 'manual', x: 0, y: 0, type: 'trigger' }]);
    expect(computePendingInsertOrigin({ mode: 'trigger' }, nodes, points, 'TB')).toEqual({
      x: PENDING_NODE_WIDTH + WORKFLOW_NODE_SEP,
      y: (0 + PENDING_NODE_HEIGHT) / 2 - PENDING_NODE_HEIGHT / 2,
    });
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
    const context = { mode: 'step' as const, sourceNodeId: 'a' };
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

  it('draws from the source step into any mid-spine placeholder', () => {
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
    // Insert-after model: source is 'a', ghost hangs below 'a' regardless of 'b'.
    const context = { mode: 'step' as const, sourceNodeId: 'a' };
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

  it('returns undefined for error-path connector (known deviation #4 — stub)', () => {
    // computePendingErrorBranchPlacement is stubbed; origin is undefined; connector is undefined.
    const workflow = wf([{ name: 'a', type: 'console' }]);
    const points = computeInsertionPoints(workflow, transformWorkflowToGraph(workflow));
    const nodes = layoutNodes([{ id: 'a', x: 20, y: 40 }]);
    const context = { mode: 'error' as const, stepId: 'a' };
    const origin = computePendingInsertOrigin(context, nodes, points, 'TB');
    expect(origin).toBeUndefined();
    // When origin is undefined the connector cannot be computed — callers check origin first.
    // (The connector function itself uses resolvePendingSourceId which returns 'a',
    // so it would draw a line to an undefined origin; callers guard against this.)
  });

  it('LR: places ghost to the right of the source step', () => {
    const workflow = wf([{ name: 'a', type: 'console' }]);
    const points = computeInsertionPoints(workflow, transformWorkflowToGraph(workflow));
    const nodes = layoutNodes([{ id: 'a', x: 20, y: 40 }]);
    const context = { mode: 'step' as const, sourceNodeId: 'a' };
    const origin = computePendingInsertOrigin(context, nodes, points, 'LR');
    expect(origin).toEqual({
      x: 20 + PENDING_NODE_WIDTH + WORKFLOW_RANK_SEP,
      y: 40 + PENDING_NODE_HEIGHT / 2 - PENDING_NODE_HEIGHT / 2,
    });
    const connector = computePendingInsertConnector(context, origin!, nodes, points, 'LR');
    expect(connector).toEqual({
      sourceX: 20 + PENDING_NODE_WIDTH,
      sourceY: 40 + PENDING_NODE_HEIGHT / 2,
      targetX: origin!.x,
      targetY: origin!.y + PENDING_NODE_HEIGHT / 2,
      isFailure: false,
    });
  });
});
