/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Node } from '@xyflow/react';
import {
  boundsFromNodes,
  EMPTY_GRAPH_BOUNDS,
  getHomeFrameBounds,
  getResetViewTarget,
  TOP_PADDING,
} from './viewport_framing';

const makeNode = (overrides: Partial<Node> & Pick<Node, 'id'>): Node => ({
  position: { x: 0, y: 0 },
  data: {},
  ...overrides,
});

describe('boundsFromNodes', () => {
  it('returns undefined when there are no top-level nodes', () => {
    expect(boundsFromNodes([])).toBeUndefined();
    expect(boundsFromNodes([makeNode({ id: 'child', parentId: 'group' })])).toBeUndefined();
  });

  it('computes the AABB of top-level nodes and ignores parent-relative children', () => {
    const bounds = boundsFromNodes([
      makeNode({ id: 'a', position: { x: 10, y: 20 }, width: 100, height: 50 }),
      makeNode({ id: 'b', position: { x: 200, y: 100 }, width: 100, height: 50 }),
      makeNode({ id: 'child', parentId: 'a', position: { x: 9999, y: 9999 } }),
    ]);
    expect(bounds).toEqual({
      minX: 10,
      minY: 20,
      maxX: 300,
      maxY: 150,
      centerX: 155,
      centerY: 85,
    });
  });

  it('falls back to the pending node footprint when a node has no measured size', () => {
    expect(boundsFromNodes([makeNode({ id: 'a' })])).toEqual({
      minX: 0,
      minY: 0,
      maxX: 300,
      maxY: 52,
      centerX: 150,
      centerY: 26,
    });
  });
});

describe('getHomeFrameBounds', () => {
  const trigger = makeNode({ id: 't', type: 'trigger', width: 100, height: 50 });
  const wide = makeNode({
    id: 'wide',
    type: 'step',
    position: { x: 500, y: 200 },
    width: 100,
    height: 50,
  });

  it('frames only triggers and settings groups when present', () => {
    expect(getHomeFrameBounds([trigger, wide], EMPTY_GRAPH_BOUNDS)).toEqual(
      boundsFromNodes([trigger])
    );
    const group = makeNode({ id: 'g', type: 'settingsGroup', position: { x: 0, y: -100 } });
    expect(getHomeFrameBounds([group, trigger, wide], EMPTY_GRAPH_BOUNDS)).toEqual(
      boundsFromNodes([group, trigger])
    );
  });

  it('frames all nodes when there is no leading rank', () => {
    expect(getHomeFrameBounds([wide], EMPTY_GRAPH_BOUNDS)).toEqual(boundsFromNodes([wide]));
  });

  it('uses the fallback when there are no top-level nodes', () => {
    expect(getHomeFrameBounds([], EMPTY_GRAPH_BOUNDS)).toBe(EMPTY_GRAPH_BOUNDS);
  });
});

describe('getResetViewTarget', () => {
  const bounds = { minX: 10, minY: 20, centerX: 150, centerY: 90 };

  it('anchors the top edge and centres horizontally for TB', () => {
    expect(getResetViewTarget('TB', bounds, 1000, 800)).toEqual({
      x: 150,
      y: 20 + 400 - TOP_PADDING,
    });
  });

  it('anchors the left edge and centres vertically for LR', () => {
    expect(getResetViewTarget('LR', bounds, 1000, 800)).toEqual({
      x: 10 + 500 - TOP_PADDING,
      y: 90,
    });
  });

  it('honours a custom top padding', () => {
    expect(getResetViewTarget('TB', bounds, 1000, 800, 10)).toEqual({ x: 150, y: 410 });
  });
});
