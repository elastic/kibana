/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import type { Node } from '@xyflow/react';
import type { InsertionPoints, NodePortTargets } from './compute_insertion_points';
import type { PendingInsertVisual } from './pending_insert';
import { useDecoratedNodes } from './use_decorated_nodes';
import type { NodeConfigWarningReason } from './workflow_graph_actions_context';

type HookParams = Parameters<typeof useDecoratedNodes>[0];

const makeNode = (id: string): Node => ({
  id,
  type: 'step',
  position: { x: 0, y: 0 },
  data: { label: id, stepType: 'http' },
});

/** Fresh port-target objects on every call, as `computeInsertionPoints` rebuilds them per YAML edit. */
const makePortTargets = (id: string, isTerminal = false): NodePortTargets => ({
  step: { sourceNodeId: id, stepName: id, isTerminal },
});

const makeInsertionPoints = (terminalById: Readonly<Record<string, boolean>>): InsertionPoints => ({
  byNodeId: new Map(
    Object.entries(terminalById).map(([id, isTerminal]) => [id, makePortTargets(id, isTerminal)])
  ),
  topLevelStepNodeIds: Object.keys(terminalById),
});

const baseParams = (overrides: Partial<HookParams> = {}): HookParams => ({
  nodes: [makeNode('a'), makeNode('b'), makeNode('c')],
  insertionPoints: makeInsertionPoints({ a: false, b: false, c: true }),
  isEditMode: true,
  selectedStepId: undefined,
  nodeConfigWarnings: undefined,
  pendingInsert: undefined,
  ...overrides,
});

const nodeById = (nodes: readonly Node[], id: string): Node => {
  const node = nodes.find((candidate) => candidate.id === id);
  if (!node) throw new Error(`node ${id} not found`);
  return node;
};

describe('useDecoratedNodes identity preservation', () => {
  it('passes undecorated nodes and the input array through untouched outside edit mode', () => {
    const params = baseParams({ isEditMode: false });
    const { result } = renderHook(useDecoratedNodes, { initialProps: params });

    expect(result.current).toHaveLength(3);
    result.current.forEach((node, index) => {
      expect(node).toBe(params.nodes[index]);
    });
  });

  it('writes per-node port targets onto data in edit mode without mutating the inputs', () => {
    const params = baseParams();
    const { result } = renderHook(useDecoratedNodes, { initialProps: params });

    expect(nodeById(result.current, 'c').data.portTargets).toEqual(makePortTargets('c', true));
    expect(nodeById(result.current, 'c')).not.toBe(params.nodes[2]);
    expect(params.nodes[2].data.portTargets).toBeUndefined();
  });

  it('keeps identity for all nodes when only the insertion points are rebuilt with equal content', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c')];
    const { result, rerender } = renderHook(useDecoratedNodes, {
      initialProps: baseParams({ nodes }),
    });
    const firstOutput = result.current;

    rerender(
      baseParams({
        nodes,
        insertionPoints: makeInsertionPoints({ a: false, b: false, c: true }),
      })
    );

    expect(result.current).toBe(firstOutput);
    firstOutput.forEach((node, index) => {
      expect(result.current[index]).toBe(node);
    });
  });

  it('recreates only the node whose port targets changed and keeps its siblings identical', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c')];
    const { result, rerender } = renderHook(useDecoratedNodes, {
      initialProps: baseParams({ nodes }),
    });
    const before = result.current;

    // `b` becomes terminal; `a` and `c` are rebuilt with equal content.
    rerender(
      baseParams({
        nodes,
        insertionPoints: makeInsertionPoints({ a: false, b: true, c: true }),
      })
    );
    const after = result.current;

    expect(after).not.toBe(before);
    expect(nodeById(after, 'b')).not.toBe(nodeById(before, 'b'));
    expect(nodeById(after, 'b').data.portTargets).toEqual(makePortTargets('b', true));
    expect(nodeById(after, 'a')).toBe(nodeById(before, 'a'));
    expect(nodeById(after, 'c')).toBe(nodeById(before, 'c'));
    expect(nodeById(after, 'a').data.portTargets).toBe(nodeById(before, 'a').data.portTargets);
  });

  it('recreates only the node whose config warning changed', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c')];
    const warnings = (b: NodeConfigWarningReason): ReadonlyMap<string, NodeConfigWarningReason> =>
      new Map([['b', b]]);
    const { result, rerender } = renderHook(useDecoratedNodes, {
      initialProps: baseParams({ nodes, nodeConfigWarnings: warnings('incomplete') }),
    });
    const before = result.current;
    expect(nodeById(before, 'b').data.configWarning).toBe('incomplete');

    // A fresh Map with equal content must not invalidate anything.
    rerender(baseParams({ nodes, nodeConfigWarnings: warnings('incomplete') }));
    expect(result.current).toBe(before);

    rerender(baseParams({ nodes, nodeConfigWarnings: warnings('both') }));
    const after = result.current;
    expect(nodeById(after, 'b')).not.toBe(nodeById(before, 'b'));
    expect(nodeById(after, 'b').data.configWarning).toBe('both');
    expect(nodeById(after, 'a')).toBe(nodeById(before, 'a'));
    expect(nodeById(after, 'c')).toBe(nodeById(before, 'c'));
  });

  it('recreates only the previously and newly selected nodes when the selection moves', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c')];
    const { result, rerender } = renderHook(useDecoratedNodes, {
      initialProps: baseParams({ nodes, selectedStepId: 'a' }),
    });
    const selectedA = result.current;
    expect(nodeById(selectedA, 'a').selected).toBe(true);

    rerender(baseParams({ nodes, selectedStepId: 'b' }));
    const selectedB = result.current;

    // The layout input carries no selection, so a deselected node simply has none.
    expect(nodeById(selectedB, 'a').selected).toBeFalsy();
    expect(nodeById(selectedB, 'b').selected).toBe(true);
    expect(nodeById(selectedB, 'a')).not.toBe(nodeById(selectedA, 'a'));
    expect(nodeById(selectedB, 'c')).toBe(nodeById(selectedA, 'c'));
  });

  it('flags only the node whose fallback target owns the pending error-path insert', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c')];
    const withFallbackTarget: InsertionPoints = {
      byNodeId: new Map<string, NodePortTargets>([
        ['a', { ...makePortTargets('a'), fallbackTarget: { stepName: 'a', nodeId: 'a' } }],
        ['b', { ...makePortTargets('b'), fallbackTarget: { stepName: 'b', nodeId: 'b' } }],
        ['c', makePortTargets('c', true)],
      ]),
      topLevelStepNodeIds: ['a', 'b', 'c'],
    };
    const pendingInsert: PendingInsertVisual = {
      phase: 'choosing',
      context: { mode: 'error', stepId: 'b' },
    };
    const { result, rerender } = renderHook(useDecoratedNodes, {
      initialProps: baseParams({ nodes, insertionPoints: withFallbackTarget }),
    });
    const before = result.current;

    rerender(baseParams({ nodes, insertionPoints: withFallbackTarget, pendingInsert }));
    const after = result.current;

    expect(nodeById(after, 'b').data.creatingErrorPath).toBe(true);
    expect(nodeById(after, 'b')).not.toBe(nodeById(before, 'b'));
    expect(nodeById(after, 'a').data.creatingErrorPath).toBeUndefined();
    expect(nodeById(after, 'a')).toBe(nodeById(before, 'a'));
    expect(nodeById(after, 'c')).toBe(nodeById(before, 'c'));
  });
});
