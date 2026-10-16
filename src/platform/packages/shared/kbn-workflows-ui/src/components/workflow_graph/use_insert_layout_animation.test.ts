/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook } from '@testing-library/react';
import type { Edge, Node } from '@xyflow/react';
import { INSERT_LAYOUT_MS, useInsertLayoutAnimation } from './use_insert_layout_animation';

function node(id: string, x: number, y: number): Node {
  return { id, position: { x, y }, data: { label: id }, type: 'workflowNode' };
}

function edge(id: string, source: string, target: string): Edge {
  return { id, source, target };
}

describe('useInsertLayoutAnimation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      return window.setTimeout(() => cb(performance.now()), 16) as unknown as number;
    });
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
      window.clearTimeout(id as unknown as number);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('interpolates existing node positions when a mid-flow node is inserted', () => {
    const initial = [node('a', 0, 0), node('b', 0, 100)];
    const { result, rerender } = renderHook(
      ({ nodes, flashNodeId }: { nodes: Node[]; flashNodeId?: string }) =>
        useInsertLayoutAnimation({
          nodes,
          edges: [edge('e1', 'a', 'b'), edge('e2', 'a', 'new')],
          flashNodeId,
        }),
      { initialProps: { nodes: initial, flashNodeId: undefined as string | undefined } }
    );

    expect(result.current.nodes[1].position).toEqual({ x: 0, y: 100 });

    const next = [node('a', 0, 0), node('new', 0, 100), node('b', 0, 230)];
    rerender({ nodes: next, flashNodeId: 'new' });

    act(() => {
      jest.advanceTimersByTime(16);
    });
    expect(result.current.isSliding).toBe(true);
    const midY = result.current.nodes.find((n) => n.id === 'b')?.position.y ?? 0;
    expect(midY).toBeGreaterThan(100);
    expect(midY).toBeLessThan(230);

    act(() => {
      jest.advanceTimersByTime(INSERT_LAYOUT_MS + 50);
    });
    expect(result.current.nodes.find((n) => n.id === 'b')?.position).toEqual({ x: 0, y: 230 });
  });

  it('slides on horizontal (LR) layout shifts as well', () => {
    const initial = [node('a', 0, 0), node('b', 200, 0)];
    const { result, rerender } = renderHook(
      ({ nodes }: { nodes: Node[] }) =>
        useInsertLayoutAnimation({ nodes, edges: [], flashNodeId: 'new' }),
      { initialProps: { nodes: initial } }
    );

    rerender({
      nodes: [node('a', 0, 0), node('new', 200, 0), node('b', 430, 0)],
    });

    act(() => {
      jest.advanceTimersByTime(16);
    });
    const midX = result.current.nodes.find((n) => n.id === 'b')?.position.x ?? 0;
    expect(midX).toBeGreaterThan(200);
    expect(midX).toBeLessThan(430);
  });

  it('marks edges into the inserted node for draw-in while sliding', () => {
    const initial = [node('a', 0, 0), node('b', 0, 100)];
    const { result, rerender } = renderHook(
      ({ nodes, flashNodeId }: { nodes: Node[]; flashNodeId?: string }) =>
        useInsertLayoutAnimation({
          nodes,
          edges: [edge('into', 'a', 'new'), edge('out', 'new', 'b'), edge('unrelated', 'a', 'b')],
          flashNodeId,
        }),
      { initialProps: { nodes: initial, flashNodeId: undefined as string | undefined } }
    );

    rerender({
      nodes: [node('a', 0, 0), node('new', 0, 100), node('b', 0, 230)],
      flashNodeId: 'new',
    });

    act(() => {
      jest.advanceTimersByTime(16);
    });
    const sliding = result.current.edges;
    expect(
      sliding.filter((e) => (e.data as { drawIn?: boolean } | undefined)?.drawIn)
    ).toHaveLength(2);
    expect(sliding.find((e) => e.id === 'unrelated')?.data).not.toHaveProperty('drawIn');
  });

  it('skips drawIn for bypass-lane target edges during sliding', () => {
    // Bypass-lane target edges (hideEndMarker=true) point to invisible 1×1
    // placeholder nodes, so the progressive-reveal animation must not run on them.
    const initial = [node('sw', 0, 0), node('after', 0, 200)];
    const { result, rerender } = renderHook(
      ({ nodes, flashNodeId }: { nodes: Node[]; flashNodeId?: string }) =>
        useInsertLayoutAnimation({
          nodes,
          edges: [
            // New bypass edge for the inserted case branch — targets a bypass node.
            {
              ...edge('sw-case0', 'sw', 'case0-bypass'),
              data: { hideEndMarker: true },
            },
            // Existing default bypass edge — also targets a bypass node.
            {
              ...edge('sw-default', 'sw', 'default-bypass'),
              data: { hideEndMarker: true },
            },
            // Normal edge leaving the inserted bypass node — still draws in.
            edge('merge', 'case0-bypass', 'after'),
          ],
          flashNodeId,
        }),
      { initialProps: { nodes: initial, flashNodeId: undefined as string | undefined } }
    );

    rerender({
      nodes: [
        node('sw', 0, 0),
        node('case0-bypass', -60, 122),
        node('default-bypass', 60, 122),
        node('after', 0, 244),
      ],
      flashNodeId: 'case0-bypass',
    });

    act(() => {
      jest.advanceTimersByTime(16);
    });

    const sliding = result.current.edges;

    const bypassEdges = sliding.filter(
      (e) => (e.data as { hideEndMarker?: boolean } | undefined)?.hideEndMarker
    );
    expect(bypassEdges).toHaveLength(2);
    for (const e of bypassEdges) {
      // drawIn must not be set — bypass nodes are invisible placeholders.
      expect((e.data as { drawIn?: boolean } | undefined)?.drawIn).toBeUndefined();
    }

    const mergeEdge = sliding.find((e) => e.id === 'merge');
    expect((mergeEdge?.data as { drawIn?: boolean } | undefined)?.drawIn).toBe(true);
  });

  it('clears draw-in after the slide completes', () => {
    const initial = [node('a', 0, 0), node('b', 0, 100)];
    const { result, rerender } = renderHook(
      ({ nodes, flashNodeId }: { nodes: Node[]; flashNodeId?: string }) =>
        useInsertLayoutAnimation({
          nodes,
          edges: [edge('into', 'a', 'new'), edge('out', 'new', 'b')],
          flashNodeId,
        }),
      { initialProps: { nodes: initial, flashNodeId: undefined as string | undefined } }
    );

    rerender({
      nodes: [node('a', 0, 0), node('new', 0, 100), node('b', 0, 230)],
      flashNodeId: 'new',
    });

    act(() => {
      jest.advanceTimersByTime(16);
    });
    expect(result.current.isSliding).toBe(true);

    act(() => {
      jest.advanceTimersByTime(INSERT_LAYOUT_MS + 50);
    });
    expect(result.current.isSliding).toBe(false);
    const restored = result.current.edges.find((e) => e.id === 'into');
    expect((restored?.data as { drawIn?: boolean } | undefined)?.drawIn).toBeUndefined();
  });

  it('marks the inserted node with flash after the slide', () => {
    const initial = [node('a', 0, 0)];
    const { result, rerender } = renderHook(
      ({ nodes, flashNodeId }: { nodes: Node[]; flashNodeId?: string }) =>
        useInsertLayoutAnimation({ nodes, edges: [], flashNodeId }),
      { initialProps: { nodes: initial, flashNodeId: undefined as string | undefined } }
    );

    rerender({ nodes: [node('a', 0, 0), node('new', 0, 100)], flashNodeId: 'new' });
    expect(result.current.nodes.find((n) => n.id === 'new')?.data).not.toMatchObject({
      flash: true,
    });

    act(() => {
      jest.advanceTimersByTime(INSERT_LAYOUT_MS + 10);
    });
    expect(result.current.nodes.find((n) => n.id === 'new')?.data).toMatchObject({ flash: true });
  });

  it('still slides when layout updates before flashNodeId', () => {
    const initial = [node('a', 0, 0), node('b', 0, 100)];
    const { result, rerender } = renderHook(
      ({ nodes, flashNodeId }: { nodes: Node[]; flashNodeId?: string }) =>
        useInsertLayoutAnimation({ nodes, edges: [], flashNodeId }),
      { initialProps: { nodes: initial, flashNodeId: undefined as string | undefined } }
    );

    rerender({
      nodes: [node('a', 0, 0), node('new', 0, 100), node('b', 0, 230)],
      flashNodeId: undefined,
    });

    act(() => {
      jest.advanceTimersByTime(16);
    });
    expect(result.current.isSliding).toBe(true);
    const midY = result.current.nodes.find((n) => n.id === 'b')?.position.y ?? 0;
    expect(midY).toBeGreaterThan(100);
    expect(midY).toBeLessThan(230);
  });

  describe('render stability', () => {
    it('returns the same node and edge identities when re-rendered with identical inputs', () => {
      const nodes = [node('a', 0, 0), node('b', 0, 100)];
      const edges = [edge('e1', 'a', 'b')];
      const { result, rerender } = renderHook(
        ({ flashNodeId }: { flashNodeId?: string }) =>
          useInsertLayoutAnimation({ nodes, edges, flashNodeId }),
        { initialProps: { flashNodeId: 'b' as string | undefined } }
      );
      act(() => {
        jest.advanceTimersByTime(INSERT_LAYOUT_MS + 10);
      });
      const first = result.current;
      expect(first.nodes.find((n) => n.id === 'b')?.data).toMatchObject({ flash: true });

      rerender({ flashNodeId: 'b' });
      expect(result.current.nodes).toBe(first.nodes);
      expect(result.current.edges).toBe(first.edges);
    });

    it('keeps edge identity across re-renders while sliding', () => {
      const edges = [edge('into', 'a', 'new'), edge('out', 'new', 'b')];
      const next = [node('a', 0, 0), node('new', 0, 100), node('b', 0, 230)];
      const { result, rerender } = renderHook(
        ({ nodes }: { nodes: Node[] }) => useInsertLayoutAnimation({ nodes, edges }),
        { initialProps: { nodes: [node('a', 0, 0), node('b', 0, 100)] } }
      );
      rerender({ nodes: next });
      expect(result.current.isSliding).toBe(true);
      const slidingEdges = result.current.edges;

      // A tick re-renders with new displayNodes but identical edges/sliding state.
      act(() => {
        jest.advanceTimersByTime(16);
      });
      expect(result.current.isSliding).toBe(true);
      expect(result.current.edges).toBe(slidingEdges);
    });

    it('does not re-render or slide when only the node identities change', () => {
      let renders = 0;
      const { result, rerender } = renderHook(
        ({ nodes }: { nodes: Node[] }) => {
          renders += 1;
          return useInsertLayoutAnimation({ nodes, edges: [] });
        },
        { initialProps: { nodes: [node('a', 0, 0), node('b', 0, 100)] } }
      );

      const before = renders;
      // Selection / status poll: new node objects at the same positions.
      const selected = [node('a', 0, 0), { ...node('b', 0, 100), selected: true }];
      rerender({ nodes: selected });

      expect(renders - before).toBe(1);
      expect(result.current.isSliding).toBe(false);
      expect(result.current.nodes).toBe(selected);
    });

    it('does not slide when switching to a graph that only shares a node id', () => {
      const { result, rerender } = renderHook(
        ({ nodes }: { nodes: Node[] }) => useInsertLayoutAnimation({ nodes, edges: [] }),
        { initialProps: { nodes: [node('trigger', 0, 0), node('old_step', 0, 100)] } }
      );

      rerender({ nodes: [node('trigger', 40, 0), node('other_step', 40, 120)] });
      act(() => {
        jest.advanceTimersByTime(16);
      });
      expect(result.current.isSliding).toBe(false);
      expect(result.current.nodes.find((n) => n.id === 'other_step')?.position).toEqual({
        x: 40,
        y: 120,
      });
    });

    it('still slides when a step is inserted into an empty branch (bypass lane replaced)', () => {
      const bypass: Node = { ...node('lane', 0, 100), type: 'bypassLane' };
      const { result, rerender } = renderHook(
        ({ nodes }: { nodes: Node[] }) => useInsertLayoutAnimation({ nodes, edges: [] }),
        { initialProps: { nodes: [node('a', 0, 0), bypass, node('b', 0, 200)] } }
      );

      rerender({ nodes: [node('a', 0, 0), node('new', 0, 100), node('b', 0, 330)] });
      act(() => {
        jest.advanceTimersByTime(16);
      });
      expect(result.current.isSliding).toBe(true);
    });
  });
});
