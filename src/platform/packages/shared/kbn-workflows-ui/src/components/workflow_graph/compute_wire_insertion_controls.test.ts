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
import { computeWireInsertionControls, segmentMidpoint } from './compute_wire_insertion_controls';
import {
  FORK_BUS_LABEL_OFFSET,
  FORK_BUS_TRUNK,
  MERGE_BUS_TRUNK,
  TERMINAL_STUB_PX,
} from './workflow_graph_geometry';

describe('segmentMidpoint', () => {
  it('returns the geometric midpoint on both axes', () => {
    expect(segmentMidpoint({ x: 0, y: 0 }, { x: 100, y: 40 })).toEqual({ x: 50, y: 20 });
    expect(segmentMidpoint({ x: 10, y: 10 }, { x: 10, y: 90 })).toEqual({ x: 10, y: 50 });
  });
});

describe('computeWireInsertionControls', () => {
  const insertionPoints: InsertionPoints = {
    byNodeId: new Map([
      [
        'a',
        {
          step: { sourceNodeId: 'a', stepName: 'step-a' },
          fallbackTarget: { stepName: 'step-a', nodeId: 'a' },
        },
      ],
      [
        'b',
        {
          step: { sourceNodeId: 'b', stepName: 'step-b', isTerminal: true },
          fallbackTarget: { stepName: 'step-b', nodeId: 'b' },
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

  const edges: Edge[] = [{ id: 'a-b', source: 'a', target: 'b', type: 'workflow' }];

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
    expect(wire!.centre).toEqual(segmentMidpoint(wire!.segmentStart, wire!.segmentEnd));
    expect(wire!.centre).toEqual({ x: 100, y: 74 });
    // fallbackStepName is undefined when stepSupportsErrorHandling('slack') is false
    // (slack does not support error-handling in the current registry).
    // The control geometry test is the main assertion here.
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
    expect(wire!.centre).toEqual(segmentMidpoint(wire!.segmentStart, wire!.segmentEnd));
    // a exit: (200, 24) → b entry: (300, 24); mid x = 250
    expect(wire!.centre).toEqual({ x: 250, y: 24 });
  });

  it('places fork (true/false) controls below the chip (terminal kind, chip-adjacent)', () => {
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
            branches: new Map([
              [
                'steps',
                { slot: { kind: 'steps' as const }, ownerStepName: 'gate', isTerminal: false },
              ],
              [
                'else',
                { slot: { kind: 'else' as const }, ownerStepName: 'gate', isTerminal: false },
              ],
            ]),
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
    // Fork branch-head chips sit below the bus label. They connect a real
    // fork to a real branch head, so they're wire-kind (hover-only), not
    // always-visible terminals.
    const thenCtrl = controls.find((c) => c.id === 'terminal:fork:gate-then');
    const elseCtrl = controls.find((c) => c.id === 'terminal:fork:gate-else');
    expect(thenCtrl).toBeDefined();
    expect(elseCtrl).toBeDefined();
    expect(thenCtrl!.kind).toBe('wire');
    expect(elseCtrl!.kind).toBe('wire');
    // gate exit = center-bottom of gate: x=200, y=48.
    // Chip Y = gateExitY + FORK_BUS_TRUNK + FORK_BUS_LABEL_OFFSET.
    // "+" centre Y = chipY + 36 (CHIP_PLUS_GAP = chip_half_incl_border + button_half + 14px gap).
    const CHIP_PLUS_GAP = 36;
    const chipOffset = FORK_BUS_TRUNK + FORK_BUS_LABEL_OFFSET;
    const gateExitY = 48; // gate y=0, height=48
    const expectedPlusY = gateExitY + chipOffset + CHIP_PLUS_GAP;
    // then-branch chip X = thenStep center top X = 0 + 200/2 = 100.
    expect(thenCtrl!.centre).toEqual({ x: 100, y: expectedPlusY });
    // else-branch chip X = elseStep center top X = 200 + 200/2 = 300.
    expect(elseCtrl!.centre).toEqual({ x: 300, y: expectedPlusY });
  });

  it('collapses trigger fan-in to a single wire control on the trunk below the bus', () => {
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
        // Trigger nodes: no stepName (clicking the port means prepend-step).
        ['manual', { step: { sourceNodeId: 'manual' } }],
        ['alert', { step: { sourceNodeId: 'alert' } }],
        ['join', { step: { sourceNodeId: 'join', stepName: 'join-step', isTerminal: true } }],
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
    // One wire control on the trunk below the bus, centred between bus exit and target entry.
    // No per-source branch-tail terminals.
    const branchTails = controls.filter((c) => c.id.startsWith('terminal:branch-tail:'));
    expect(branchTails).toHaveLength(0);
    const fanInWires = controls.filter((c) => c.id === 'wire:trigger-fanin:join');
    expect(fanInWires).toHaveLength(1);
    // manual exits at y=48; alert exits at y=48. Bus Y = 48. Target entry at (210, 200).
    // Control centre = midpoint of ({x:210,y:48}, {x:210,y:200}) = {x:210, y:124}.
    expect(fanInWires[0].centre).toEqual({ x: 210, y: 124 });
    expect(fanInWires[0].insertContext).toEqual({ mode: 'prepend-step' });
    // No plain terminal stubs should be added for the trigger sources.
    expect(
      controls.filter(
        (c) =>
          c.kind === 'terminal' &&
          c.id.startsWith('terminal:') &&
          !c.id.startsWith('terminal:branch-tail:') &&
          (c.insertContext as { stepName?: string }).stepName === undefined
      )
    ).toHaveLength(0);
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
    // Independent of inter-rank spacing so terminal stubs stay visually distinct.
    expect(TERMINAL_STUB_PX).toBe(75);
    // No duplicate terminal for a (already has a wire).
    expect(controls.some((c) => c.kind === 'terminal' && c.id.includes(':a:'))).toBe(false);
  });

  it('treats branchIndex 0 on a merge step as a branch edge, not a merge body edge', () => {
    const mergeStepNodes: Node[] = [
      {
        id: 'm',
        type: 'step',
        position: { x: 0, y: 0 },
        width: 200,
        height: 48,
        data: { stepType: 'merge', label: 'm' },
      },
      {
        id: 'child',
        type: 'step',
        position: { x: 0, y: 200 },
        width: 200,
        height: 48,
        data: { stepType: 'slack', label: 'child' },
      },
    ];
    const mergeStepInsertion: InsertionPoints = {
      byNodeId: new Map([
        [
          'm',
          {
            branches: new Map([
              [
                'steps',
                { slot: { kind: 'steps' as const }, ownerStepName: 'm', isTerminal: false },
              ],
              [
                'branch:0',
                {
                  slot: { kind: 'branch' as const, index: 0 },
                  ownerStepName: 'm',
                  isTerminal: false,
                },
              ],
            ]),
          },
        ],
      ]),
      topLevelStepNodeIds: ['m', 'child'],
    };
    const controls = computeWireInsertionControls({
      nodes: mergeStepNodes,
      edges: [{ id: 'm-child', source: 'm', target: 'child', data: { branchIndex: 0 } }],
      insertionPoints: mergeStepInsertion,
      direction: 'TB',
    });
    const fork = controls.find((c) => c.id === 'terminal:fork:m-child');
    expect(fork?.insertContext).toEqual({
      mode: 'branch',
      stepName: 'm',
      branch: { kind: 'branch', index: 0 },
      position: 'start',
    });
  });

  it('LR: places the fork-head + past the chip with a non-empty stub', () => {
    const lrNodes: Node[] = [
      {
        id: 'gate',
        type: 'step',
        position: { x: 0, y: 0 },
        width: 200,
        height: 48,
        data: { stepType: 'if', label: 'gate' },
      },
      {
        id: 'thenStep',
        type: 'step',
        position: { x: 400, y: 0 },
        width: 200,
        height: 48,
        data: { stepType: 'slack', label: 'then' },
      },
    ];
    const lrInsertion: InsertionPoints = {
      byNodeId: new Map([
        [
          'gate',
          {
            branches: new Map([
              [
                'steps',
                { slot: { kind: 'steps' as const }, ownerStepName: 'gate', isTerminal: false },
              ],
            ]),
          },
        ],
      ]),
      topLevelStepNodeIds: ['gate', 'thenStep'],
    };
    const controls = computeWireInsertionControls({
      nodes: lrNodes,
      edges: [
        {
          id: 'gate-then',
          source: 'gate',
          target: 'thenStep',
          sourceHandle: 'then',
          data: { branchType: 'then', label: 'true' },
        },
      ],
      insertionPoints: lrInsertion,
      direction: 'LR',
    });
    const ctrl = controls.find((c) => c.id === 'terminal:fork:gate-then');
    // gate exit x = 200; chip centre = 200 + FORK_BUS_TRUNK + FORK_BUS_LABEL_OFFSET.
    const chipX = 200 + FORK_BUS_TRUNK + FORK_BUS_LABEL_OFFSET;
    // 'true' chip: 4 chars * 6.6 + 2 * 12 padding + 2 * 1 border = 52.4 wide.
    const chipHalfWidth = 52.4 / 2;
    expect(ctrl!.segmentStart.x).toBeCloseTo(chipX + chipHalfWidth);
    // "+" centre = chip edge + 14px clearance + button half (11).
    expect(ctrl!.centre.x).toBeCloseTo(chipX + chipHalfWidth + 14 + 11);
    expect(ctrl!.centre.y).toBe(24);
    expect(ctrl!.segmentStart.y).toBe(24);
    // The hit strip owns the whole wire down to the branch head (entry = left edge, mid height),
    // not just the stub up to the +.
    expect(ctrl!.segmentEnd).toEqual({ x: 400, y: 24 });
    expect(ctrl!.centre.x).toBeLessThan(ctrl!.segmentEnd.x);
  });

  it('TB: the fork-head hit strip runs from the chip edge to the branch head entry', () => {
    const tbNodes: Node[] = [
      {
        id: 'gate',
        type: 'step',
        position: { x: 0, y: 0 },
        width: 200,
        height: 48,
        data: { stepType: 'if', label: 'gate' },
      },
      {
        id: 'thenStep',
        type: 'step',
        position: { x: 0, y: 300 },
        width: 200,
        height: 48,
        data: { stepType: 'slack', label: 'then' },
      },
    ];
    const tbInsertion: InsertionPoints = {
      byNodeId: new Map([
        [
          'gate',
          {
            branches: new Map([
              [
                'steps',
                { slot: { kind: 'steps' as const }, ownerStepName: 'gate', isTerminal: false },
              ],
            ]),
          },
        ],
      ]),
      topLevelStepNodeIds: ['gate', 'thenStep'],
    };
    const controls = computeWireInsertionControls({
      nodes: tbNodes,
      edges: [
        {
          id: 'gate-then',
          source: 'gate',
          target: 'thenStep',
          sourceHandle: 'then',
          data: { branchType: 'then', label: 'true' },
        },
      ],
      insertionPoints: tbInsertion,
      direction: 'TB',
    });
    const ctrl = controls.find((c) => c.id === 'terminal:fork:gate-then');
    expect(ctrl!.segmentEnd).toEqual({ x: 100, y: 300 });
    expect(ctrl!.segmentStart.y).toBeLessThan(ctrl!.centre.y);
    expect(ctrl!.centre.y).toBeLessThan(ctrl!.segmentEnd.y);
  });

  it('TB: an empty branch keeps one strip from the chip edge down to the merge bus', () => {
    // else branch has no steps: the layout draws a bypass lane that rejoins at the join node.
    const emptyNodes: Node[] = [
      {
        id: 'gate',
        type: 'step',
        position: { x: 0, y: 0 },
        width: 200,
        height: 48,
        data: { stepType: 'if', label: 'gate' },
      },
      {
        id: 'lane',
        type: 'bypassLane',
        position: { x: 20, y: 120 },
        width: 160,
        height: 2,
        data: {},
      },
      {
        id: 'join',
        type: 'bypassLane',
        position: { x: 20, y: 400 },
        width: 160,
        height: 2,
        data: {},
      },
    ];
    const emptyInsertion: InsertionPoints = {
      byNodeId: new Map([
        [
          'gate',
          {
            branches: new Map([
              [
                'else',
                { slot: { kind: 'else' as const }, ownerStepName: 'gate', isTerminal: true },
              ],
            ]),
          },
        ],
      ]),
      topLevelStepNodeIds: ['gate'],
    };
    const controls = computeWireInsertionControls({
      nodes: emptyNodes,
      edges: [
        {
          id: 'gate-lane',
          source: 'gate',
          target: 'lane',
          sourceHandle: 'else',
          data: { branchType: 'else', label: 'false' },
        },
        { id: 'lane-join', source: 'lane', target: 'join', data: { isMerge: true } },
      ],
      insertionPoints: emptyInsertion,
      direction: 'TB',
    });
    const ctrl = controls.find((c) => c.id === 'terminal:fork:gate-lane');
    // join entry y = 400; the bus is MERGE_BUS_TRUNK above it.
    expect(ctrl!.segmentEnd).toEqual({ x: 100, y: 400 - MERGE_BUS_TRUNK });
    expect(ctrl!.insertContext).toMatchObject({ mode: 'branch', position: 'start' });
    // The lane has no ports, so no second control competes for the same wire.
    expect(controls.filter((c) => c.kind === 'wire')).toHaveLength(1);
  });

  it('TB: the branch-tail hit strip runs from the leaf exit down to the merge bus', () => {
    const tailNodes: Node[] = [
      {
        id: 'leaf',
        type: 'step',
        position: { x: 0, y: 0 },
        width: 200,
        height: 48,
        data: { stepType: 'slack', label: 'leaf' },
      },
      {
        id: 'join',
        type: 'step',
        position: { x: 0, y: 300 },
        width: 200,
        height: 48,
        data: { stepType: 'slack', label: 'join' },
      },
    ];
    const tailInsertion: InsertionPoints = {
      byNodeId: new Map([
        ['leaf', { step: { sourceNodeId: 'leaf', stepName: 'leaf-step' } }],
        ['join', { step: { sourceNodeId: 'join', stepName: 'join-step', isTerminal: true } }],
      ]),
      topLevelStepNodeIds: ['leaf', 'join'],
    };
    const controls = computeWireInsertionControls({
      nodes: tailNodes,
      edges: [{ id: 'leaf-join', source: 'leaf', target: 'join', data: { isMerge: true } }],
      insertionPoints: tailInsertion,
      direction: 'TB',
    });
    const ctrl = controls.find((c) => c.id === 'terminal:branch-tail:leaf-join');
    // leaf exit y = 48; the + sits one stub below it; the strip ends on the bus.
    expect(ctrl!.segmentStart).toEqual({ x: 100, y: 48 });
    expect(ctrl!.centre).toEqual({ x: 100, y: 48 + TERMINAL_STUB_PX });
    expect(ctrl!.segmentEnd).toEqual({ x: 100, y: 300 - MERGE_BUS_TRUNK });
  });

  it('LR: centres the fork-head + in the free space when the gap is too tight for full clearance', () => {
    const tightNodes: Node[] = [
      {
        id: 'gate',
        type: 'step',
        position: { x: 0, y: 0 },
        width: 200,
        height: 48,
        data: { stepType: 'if', label: 'gate' },
      },
      {
        id: 'thenStep',
        type: 'step',
        // Same 101px gate-to-head gap the layout reserves.
        position: { x: 301, y: 0 },
        width: 200,
        height: 48,
        data: { stepType: 'slack', label: 'then' },
      },
    ];
    const tightInsertion: InsertionPoints = {
      byNodeId: new Map([
        [
          'gate',
          {
            branches: new Map([
              [
                'steps',
                { slot: { kind: 'steps' as const }, ownerStepName: 'gate', isTerminal: false },
              ],
            ]),
          },
        ],
      ]),
      topLevelStepNodeIds: ['gate', 'thenStep'],
    };
    const controls = computeWireInsertionControls({
      nodes: tightNodes,
      edges: [
        {
          id: 'gate-then',
          source: 'gate',
          target: 'thenStep',
          sourceHandle: 'then',
          data: { branchType: 'then', label: 'false' },
        },
      ],
      insertionPoints: tightInsertion,
      direction: 'LR',
    });
    const ctrl = controls.find((c) => c.id === 'terminal:fork:gate-then');
    const half = 22 / 2;
    expect(ctrl!.centre.x + half).toBeLessThanOrEqual(301);
    expect(ctrl!.centre.x - half).toBeGreaterThanOrEqual(ctrl!.segmentStart.x);
    expect(ctrl!.centre.x).toBeCloseTo((ctrl!.segmentStart.x + 301) / 2);
  });
});
