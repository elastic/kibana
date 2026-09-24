/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Edge, Node } from '@xyflow/react';
import type { InsertionPoints } from './compute_insertion_points';
import { MERGE_BUS_TRUNK, TRUNK_LENGTH_TO_TARGET } from './compute_edge_path';
import {
  approachTrunkSegment,
  computeWireInsertionControls,
  segmentMidpoint,
  TERMINAL_STUB_PX,
} from './compute_wire_insertion_controls';
import { WORKFLOW_RANK_SEP } from './workflow_layout_pipeline';

describe('segmentMidpoint', () => {
  it('returns the geometric midpoint on both axes', () => {
    expect(segmentMidpoint({ x: 0, y: 0 }, { x: 100, y: 40 })).toEqual({ x: 50, y: 20 });
    expect(segmentMidpoint({ x: 10, y: 10 }, { x: 10, y: 90 })).toEqual({ x: 10, y: 50 });
  });
});

describe('approachTrunkSegment', () => {
  it('returns the post-curve stub into the target (TB)', () => {
    expect(approachTrunkSegment({ x: 100, y: 200 }, 'TB', 64)).toEqual({
      start: { x: 100, y: 136 },
      end: { x: 100, y: 200 },
    });
  });

  it('returns the post-curve stub into the target (LR)', () => {
    expect(approachTrunkSegment({ x: 300, y: 24 }, 'LR', 64)).toEqual({
      start: { x: 236, y: 24 },
      end: { x: 300, y: 24 },
    });
  });
});

describe('computeWireInsertionControls', () => {
  const insertionPoints: InsertionPoints = {
    byNodeId: new Map([
      [
        'a',
        {
          step: { index: 1, sourceNodeId: 'a' },
          errorStepId: 'a',
        },
      ],
      [
        'b',
        {
          step: { index: 2, sourceNodeId: 'b' },
          errorStepId: 'b',
        },
      ],
    ]),
    topLevelStepNodeIds: ['a', 'b'],
  };

  const nodes: Node[] = [
    {
      id: 'a',
      type: 'step',
      position: { x: 0, y: 0 },
      width: 200,
      height: 48,
      data: { stepType: 'slack', label: 'a' },
    },
    {
      id: 'b',
      type: 'step',
      position: { x: 0, y: 100 },
      width: 200,
      height: 48,
      data: { stepType: 'slack', label: 'b' },
    },
  ];

  const edges: Edge[] = [
    { id: 'a-b', source: 'a', target: 'b', type: 'workflow' },
  ];

  it('places each wire control at the segment midpoint (TB)', () => {
    const controls = computeWireInsertionControls({
      nodes,
      edges,
      insertionPoints,
      direction: 'TB',
    });
    const wire = controls.find((c) => c.kind === 'wire');
    expect(wire).toBeDefined();
    // a exit: (100, 48) → b entry: (100, 100); mid y = 74
    expect(wire!.centre).toEqual(
      segmentMidpoint(wire!.segmentStart, wire!.segmentEnd)
    );
    expect(wire!.centre).toEqual({ x: 100, y: 74 });
    expect(wire!.errorStepId).toBe('a');
  });

  it('places each wire control at the segment midpoint (LR)', () => {
    const lrNodes: Node[] = [
      {
        id: 'a',
        type: 'step',
        position: { x: 0, y: 0 },
        width: 200,
        height: 48,
        data: { stepType: 'slack', label: 'a' },
      },
      {
        id: 'b',
        type: 'step',
        position: { x: 300, y: 0 },
        width: 200,
        height: 48,
        data: { stepType: 'slack', label: 'b' },
      },
    ];
    const controls = computeWireInsertionControls({
      nodes: lrNodes,
      edges,
      insertionPoints,
      direction: 'LR',
    });
    const wire = controls.find((c) => c.kind === 'wire');
    expect(wire).toBeDefined();
    expect(wire!.centre).toEqual(
      segmentMidpoint(wire!.segmentStart, wire!.segmentEnd)
    );
    // a exit: (200, 24) → b entry: (300, 24); mid x = 250
    expect(wire!.centre).toEqual({ x: 250, y: 24 });
  });

  it('places fork (true/false) controls on the post-curve approach trunk', () => {
    const forkNodes: Node[] = [
      {
        id: 'gate',
        type: 'step',
        position: { x: 100, y: 0 },
        width: 200,
        height: 48,
        data: { stepType: 'if', label: 'gate' },
      },
      {
        id: 'thenStep',
        type: 'step',
        position: { x: 0, y: 200 },
        width: 200,
        height: 48,
        data: { stepType: 'slack', label: 'then' },
      },
      {
        id: 'elseStep',
        type: 'step',
        position: { x: 200, y: 200 },
        width: 200,
        height: 48,
        data: { stepType: 'slack', label: 'else' },
      },
    ];
    const forkInsertion: InsertionPoints = {
      byNodeId: new Map([
        [
          'gate',
          {
            then: { index: 0, path: [{ stepIndex: 0, branch: 'steps' }], sourceNodeId: 'gate' },
            else: { index: 0, path: [{ stepIndex: 0, branch: 'else' }], sourceNodeId: 'gate' },
          },
        ],
      ]),
      topLevelStepNodeIds: ['gate', 'thenStep', 'elseStep'],
    };
    const forkEdges: Edge[] = [
      {
        id: 'gate-then',
        source: 'gate',
        target: 'thenStep',
        sourceHandle: 'then',
        data: { branchType: 'then' },
      },
      {
        id: 'gate-else',
        source: 'gate',
        target: 'elseStep',
        sourceHandle: 'else',
        data: { branchType: 'else' },
      },
    ];
    const controls = computeWireInsertionControls({
      nodes: forkNodes,
      edges: forkEdges,
      insertionPoints: forkInsertion,
      direction: 'TB',
    });
    const thenWire = controls.find((c) => c.id === 'wire:gate-then');
    const elseWire = controls.find((c) => c.id === 'wire:gate-else');
    expect(thenWire).toBeDefined();
    expect(elseWire).toBeDefined();
    // thenStep entry at (100, 200); approach trunk mid is half the stub above entry.
    expect(thenWire!.centre).toEqual({
      x: 100,
      y: 200 - TRUNK_LENGTH_TO_TARGET / 2,
    });
    expect(elseWire!.centre).toEqual({
      x: 300,
      y: 200 - TRUNK_LENGTH_TO_TARGET / 2,
    });
    expect(thenWire!.segmentEnd.y - thenWire!.segmentStart.y).toBe(TRUNK_LENGTH_TO_TARGET);
  });

  it('places one merge control on the shared lower trunk', () => {
    const mergeNodes: Node[] = [
      {
        id: 'manual',
        type: 'trigger',
        position: { x: 0, y: 0 },
        width: 200,
        height: 48,
        data: { stepType: 'manual', label: 'Manual' },
      },
      {
        id: 'alert',
        type: 'trigger',
        position: { x: 220, y: 0 },
        width: 200,
        height: 48,
        data: { stepType: 'alert', label: 'Alert' },
      },
      {
        id: 'join',
        type: 'step',
        position: { x: 110, y: 200 },
        width: 200,
        height: 48,
        data: { stepType: 'slack', label: 'join' },
      },
    ];
    const mergeInsertion: InsertionPoints = {
      byNodeId: new Map([
        ['manual', { step: { index: 0, sourceNodeId: 'manual' } }],
        ['alert', { step: { index: 0, sourceNodeId: 'alert' } }],
        ['join', { step: { index: 1, sourceNodeId: 'join' } }],
      ]),
      topLevelStepNodeIds: ['join'],
    };
    const mergeEdges: Edge[] = [
      { id: 'manual-join', source: 'manual', target: 'join', data: { isMerge: true } },
      { id: 'alert-join', source: 'alert', target: 'join', data: { isMerge: true } },
    ];
    const controls = computeWireInsertionControls({
      nodes: mergeNodes,
      edges: mergeEdges,
      insertionPoints: mergeInsertion,
      direction: 'TB',
    });
    const mergeWires = controls.filter((c) => c.kind === 'wire');
    expect(mergeWires).toHaveLength(1);
    // join entry at (210, 200); shared trunk mid sits MERGE_BUS_TRUNK/2 above.
    expect(mergeWires[0].centre).toEqual({
      x: 210,
      y: 200 - MERGE_BUS_TRUNK / 2,
    });
    expect(mergeWires[0].segmentEnd.y - mergeWires[0].segmentStart.y).toBe(MERGE_BUS_TRUNK);
    // Both sources still count as wired — no terminal stubs on the triggers.
    expect(controls.some((c) => c.kind === 'terminal' && c.id.includes(':manual:'))).toBe(
      false
    );
    expect(controls.some((c) => c.kind === 'terminal' && c.id.includes(':alert:'))).toBe(false);
  });

  it('adds a terminal stub for the last node with the dashed + at the tip', () => {
    const controls = computeWireInsertionControls({
      nodes,
      edges,
      insertionPoints,
      direction: 'TB',
    });
    const terminal = controls.find((c) => c.kind === 'terminal' && c.id.includes(':b:'));
    expect(terminal).toBeDefined();
    expect(terminal!.centre).toEqual(terminal!.segmentEnd);
    expect(terminal!.segmentEnd.y - terminal!.segmentStart.y).toBe(TERMINAL_STUB_PX);
    // Half a normal inter-rank arrow.
    expect(TERMINAL_STUB_PX).toBe(Math.round(WORKFLOW_RANK_SEP / 2));
    // No duplicate terminal for a (already has a wire).
    expect(controls.some((c) => c.kind === 'terminal' && c.id.includes(':a:'))).toBe(
      false
    );
  });
});
