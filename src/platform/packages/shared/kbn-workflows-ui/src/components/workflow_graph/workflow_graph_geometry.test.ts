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
  absoluteNodeBounds,
  FORK_HEAD_MIN_GAP,
  FORK_HEAD_PLUS_OFFSET,
  nodeEntryPoint,
  nodeExitPoint,
  WORKFLOW_COMPOUND_PADDING,
} from './workflow_graph_geometry';

describe('derived geometry constants', () => {
  it('keeps the compound bottom padding at the hand-computed 96', () => {
    expect(WORKFLOW_COMPOUND_PADDING.bottom).toBe(96);
  });

  it('keeps the fork-head offsets at their documented values', () => {
    expect(FORK_HEAD_PLUS_OFFSET).toBe(76);
    expect(FORK_HEAD_MIN_GAP).toBe(101);
  });
});

describe('absoluteNodeBounds', () => {
  const node = (id: string, overrides: Partial<Node>): Node => ({
    id,
    position: { x: 0, y: 0 },
    data: {},
    ...overrides,
  });

  it('accumulates the parent chain and reads the measured size', () => {
    const grandparent = node('g', { position: { x: 100, y: 200 } });
    const parent = node('p', { position: { x: 10, y: 20 }, parentId: 'g' });
    const child = node('c', {
      position: { x: 1, y: 2 },
      parentId: 'p',
      width: 30,
      height: 40,
    });
    const byId = new Map([grandparent, parent, child].map((n) => [n.id, n]));

    expect(absoluteNodeBounds(child, byId)).toEqual({ x: 111, y: 222, width: 30, height: 40 });
  });

  it('falls back to zero size by default and to the given size when provided', () => {
    const unmeasured = node('a', { position: { x: 5, y: 6 } });
    const byId = new Map([[unmeasured.id, unmeasured]]);

    expect(absoluteNodeBounds(unmeasured, byId)).toEqual({ x: 5, y: 6, width: 0, height: 0 });
    expect(absoluteNodeBounds(unmeasured, byId, { width: 300, height: 52 })).toEqual({
      x: 5,
      y: 6,
      width: 300,
      height: 52,
    });
  });
});

describe('node exit / entry points', () => {
  const bounds = { x: 10, y: 20, width: 100, height: 50 };

  it('exits at the bottom centre in TB and the right centre in LR', () => {
    expect(nodeExitPoint(bounds, 'TB')).toEqual({ x: 60, y: 70 });
    expect(nodeExitPoint(bounds, 'LR')).toEqual({ x: 110, y: 45 });
  });

  it('enters at the top centre in TB and the left centre in LR', () => {
    expect(nodeEntryPoint(bounds, 'TB')).toEqual({ x: 60, y: 20 });
    expect(nodeEntryPoint(bounds, 'LR')).toEqual({ x: 10, y: 45 });
  });
});
