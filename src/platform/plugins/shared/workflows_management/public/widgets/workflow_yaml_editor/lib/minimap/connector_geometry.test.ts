/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  buildBranchConnectors,
  buildConnectorPath,
  buildInnerRailSegments,
  buildOuterRailSegments,
} from './connector_geometry';
import type { ParentGroup } from './nesting_info';

const ITEM_HEIGHT = 32;
const OUTER_TRACK_X = 26;
const INNER_TRACK_X = 6;
const DOT_R = 4;

describe('buildOuterRailSegments', () => {
  it('draws one solid segment between consecutive top-level steps', () => {
    const depths = new Map([
      ['a', 0],
      ['b', 0],
    ]);
    const segments = buildOuterRailSegments(['a', 'b'], depths, OUTER_TRACK_X, ITEM_HEIGHT);
    expect(segments).toHaveLength(1);
    expect(segments[0].dashed).toBe(false);
  });

  it('marks the segment dashed when nested rows sit between two top-level steps', () => {
    const depths = new Map([
      ['a', 0],
      ['nested', 1],
      ['b', 0],
    ]);
    const segments = buildOuterRailSegments(
      ['a', 'nested', 'b'],
      depths,
      OUTER_TRACK_X,
      ITEM_HEIGHT
    );
    expect(segments).toHaveLength(1);
    expect(segments[0].dashed).toBe(true);
  });

  it('produces no segments for a single top-level step', () => {
    const depths = new Map([['a', 0]]);
    expect(buildOuterRailSegments(['a'], depths, OUTER_TRACK_X, ITEM_HEIGHT)).toHaveLength(0);
  });
});

describe('buildInnerRailSegments', () => {
  it('draws a rail only for branches spanning more than one row', () => {
    const parentGroups: ParentGroup[] = [
      {
        parentIndex: 0,
        branches: [
          { branchId: 'p:steps', firstIndex: 1, lastIndex: 1 }, // single-row branch — no rail
          { branchId: 'p:else', firstIndex: 2, lastIndex: 3 },
        ],
      },
    ];
    const segments = buildInnerRailSegments(parentGroups, INNER_TRACK_X, ITEM_HEIGHT);
    expect(segments).toHaveLength(1);
    expect(segments[0].key).toContain('p:else');
  });
});

describe('buildConnectorPath', () => {
  it('produces a short S-curve for an adjacent branch', () => {
    const parentCy = 0 * ITEM_HEIGHT + ITEM_HEIGHT / 2;
    const childCy = 1 * ITEM_HEIGHT + ITEM_HEIGHT / 2;
    const path = buildConnectorPath(
      parentCy,
      childCy,
      OUTER_TRACK_X,
      INNER_TRACK_X,
      DOT_R,
      ITEM_HEIGHT
    );
    expect(path.startsWith('M')).toBe(true);
    expect(path).not.toContain('L'); // short form has no straight segment
  });

  it('produces a bent path with a straight middle segment for a far branch', () => {
    const parentCy = 0 * ITEM_HEIGHT + ITEM_HEIGHT / 2;
    const childCy = 5 * ITEM_HEIGHT + ITEM_HEIGHT / 2;
    const path = buildConnectorPath(
      parentCy,
      childCy,
      OUTER_TRACK_X,
      INNER_TRACK_X,
      DOT_R,
      ITEM_HEIGHT
    );
    expect(path).toContain('L');
  });
});

describe('buildBranchConnectors', () => {
  it('emits one connector per branch', () => {
    const parentGroups: ParentGroup[] = [
      {
        parentIndex: 0,
        branches: [
          { branchId: 'p:steps', firstIndex: 1, lastIndex: 1 },
          { branchId: 'p:else', firstIndex: 2, lastIndex: 3 },
        ],
      },
    ];
    const connectors = buildBranchConnectors(
      parentGroups,
      OUTER_TRACK_X,
      INNER_TRACK_X,
      DOT_R,
      ITEM_HEIGHT
    );
    expect(connectors).toHaveLength(2);
  });
});
