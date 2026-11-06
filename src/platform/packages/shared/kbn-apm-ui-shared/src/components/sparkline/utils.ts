/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  AreaSeriesStyle,
  LineSeriesStyle,
  PartialTheme,
  RecursivePartial,
} from '@elastic/charts';

export interface SparklinePoint {
  x: number;
  y: number | null;
}

export interface SplitSeriesResult {
  mainSegments: SparklinePoint[][];
  leadingEdge: SparklinePoint[] | null;
  trailingEdge: SparklinePoint[] | null;
  interiorEdges: SparklinePoint[][];
}

export const DOTTED_LINE_STYLE: RecursivePartial<LineSeriesStyle> = {
  line: { dash: [4, 4], strokeWidth: 1 },
  point: { opacity: 0, visible: 'never' },
};

export const COMPARISON_CHART_THEME: PartialTheme = {
  areaSeriesStyle: {
    area: { visible: true, opacity: 0.5 },
    line: { strokeWidth: 1, visible: true },
    point: { visible: 'never' },
  } as RecursivePartial<AreaSeriesStyle>,
};

function isValidY(y: number | null | undefined): y is number {
  return y != null && !Number.isNaN(y);
}

export function splitSeriesAtNullGaps(data: ReadonlyArray<SparklinePoint>): SplitSeriesResult {
  if (data.length === 0) {
    return { mainSegments: [], leadingEdge: null, trailingEdge: null, interiorEdges: [] };
  }

  let first = -1;
  let last = -1;
  for (let i = 0; i < data.length; i++) {
    if (isValidY(data[i].y)) {
      first = i;
      break;
    }
  }
  for (let i = data.length - 1; i >= 0; i--) {
    if (isValidY(data[i].y)) {
      last = i;
      break;
    }
  }

  if (first === -1 || last === -1) {
    return { mainSegments: [[...data]], leadingEdge: null, trailingEdge: null, interiorEdges: [] };
  }

  const yFirst = data[first].y as number;
  const yLast = data[last].y as number;

  const leadingEdge =
    first > 0
      ? [
          { x: data[0].x, y: yFirst },
          { x: data[first].x, y: yFirst },
        ]
      : null;

  const trailingEdge =
    last < data.length - 1
      ? [
          { x: data[last].x, y: yLast },
          { x: data[data.length - 1].x, y: yLast },
        ]
      : null;

  const mainSegments: SparklinePoint[][] = [];
  let currentSegment: SparklinePoint[] = [];

  for (let i = first; i <= last; i++) {
    if (isValidY(data[i].y)) {
      currentSegment.push(data[i]);
    } else if (currentSegment.length > 0) {
      mainSegments.push(currentSegment);
      currentSegment = [];
    }
  }
  if (currentSegment.length > 0) mainSegments.push(currentSegment);

  const interiorEdges: SparklinePoint[][] = [];
  for (let i = 0; i < mainSegments.length - 1; i++) {
    const prev = mainSegments[i];
    const next = mainSegments[i + 1];
    interiorEdges.push([
      { x: prev[prev.length - 1].x, y: prev[prev.length - 1].y },
      { x: next[0].x, y: next[0].y },
    ]);
  }

  return { mainSegments, leadingEdge, trailingEdge, interiorEdges };
}
