/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { NestingInfo } from './nesting_info';

export interface RailSegment {
  key: string;
  x: number;
  y1: number;
  y2: number;
  dashed: boolean;
}

export interface BranchConnector {
  key: string;
  path: string;
}

/**
 * Outer rail, drawn as segments: solid where no branch exists between two consecutive
 * top-level steps, dashed where nested children occupy those rows.
 */
export const buildOuterRailSegments = (
  stepIds: readonly string[],
  depths: Map<string, number>,
  outerTrackX: number,
  itemHeight: number
): RailSegment[] => {
  const topLevelIndexes = stepIds.reduce<number[]>((acc, id, index) => {
    if ((depths.get(id) ?? 0) === 0) acc.push(index);
    return acc;
  }, []);

  return topLevelIndexes.flatMap((fromIdx, j, topLevel) => {
    if (j === topLevel.length - 1) return [];
    const toIdx = topLevel[j + 1];
    return [
      {
        key: `outer-seg-${j}`,
        x: outerTrackX,
        y1: fromIdx * itemHeight + itemHeight / 2,
        y2: toIdx * itemHeight + itemHeight / 2,
        dashed: toIdx > fromIdx + 1,
      },
    ];
  });
};

/** One inner-rail segment per branch, so alternative branches aren't joined into one line. */
export const buildInnerRailSegments = (
  parentGroups: NestingInfo['parentGroups'],
  innerTrackX: number,
  itemHeight: number
): RailSegment[] =>
  parentGroups.flatMap(({ parentIndex, branches }) =>
    branches
      .filter(({ firstIndex, lastIndex }) => lastIndex > firstIndex)
      .map(({ branchId, firstIndex, lastIndex }) => ({
        key: `inner-rail-${parentIndex}-${branchId}`,
        x: innerTrackX,
        y1: firstIndex * itemHeight + itemHeight / 2,
        y2: lastIndex * itemHeight + itemHeight / 2,
        dashed: false,
      }))
  );

/**
 * One S-curve (or bent, for far-apart rows) connector path from a parent to the first
 * step of one of its branches. The nearest branch gets a short S-curve; branches
 * further down drop through a middle lane so the connector neither overlaps the dashed
 * outer rail nor the earlier branches' inner rails.
 */
export const buildConnectorPath = (
  parentCy: number,
  childCy: number,
  outerTrackX: number,
  innerTrackX: number,
  dotRadius: number,
  itemHeight: number
): string => {
  const startY = parentCy + dotRadius + 2;
  if (childCy - startY <= itemHeight) {
    const midY = (startY + childCy) / 2;
    return `M ${outerTrackX} ${startY} C ${outerTrackX} ${midY} ${innerTrackX} ${midY} ${innerTrackX} ${childCy}`;
  }
  const laneX = (outerTrackX + innerTrackX) / 2;
  const bend = itemHeight / 2;
  const outY = startY + bend;
  const inY = childCy - bend;
  return [
    `M ${outerTrackX} ${startY}`,
    `C ${outerTrackX} ${(startY + outY) / 2} ${laneX} ${(startY + outY) / 2} ${laneX} ${outY}`,
    `L ${laneX} ${inY}`,
    `C ${laneX} ${(inY + childCy) / 2} ${innerTrackX} ${
      (inY + childCy) / 2
    } ${innerTrackX} ${childCy}`,
  ].join(' ');
};

export const buildBranchConnectors = (
  parentGroups: NestingInfo['parentGroups'],
  outerTrackX: number,
  innerTrackX: number,
  dotRadius: number,
  itemHeight: number
): BranchConnector[] =>
  parentGroups.flatMap(({ parentIndex, branches }) => {
    const parentCy = parentIndex * itemHeight + itemHeight / 2;
    return branches.map(({ branchId, firstIndex }) => {
      const childCy = firstIndex * itemHeight + itemHeight / 2;
      return {
        key: `connector-${parentIndex}-${branchId}`,
        path: buildConnectorPath(
          parentCy,
          childCy,
          outerTrackX,
          innerTrackX,
          dotRadius,
          itemHeight
        ),
      };
    });
  });
