/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Edge, Node } from '@xyflow/react';
import { act, renderHook } from '@testing-library/react';
import {
  INSERT_LAYOUT_MS,
  useInsertLayoutAnimation,
} from './use_insert_layout_animation';

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
    expect(
      result.current.edges.filter((e) => (e.data as { drawIn?: boolean } | undefined)?.drawIn)
    ).toHaveLength(2);
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
});
