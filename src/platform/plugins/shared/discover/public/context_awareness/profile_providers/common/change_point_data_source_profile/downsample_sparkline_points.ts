/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ChangePointSeriesPoint } from './change_point_summary_series_helpers';

export const SPARKLINE_MAX_POINTS = 100;

const averagePoint = (
  points: ChangePointSeriesPoint[],
  start: number,
  end: number
): ChangePointSeriesPoint => {
  const count = end - start;
  if (count <= 0) {
    return points[points.length - 1];
  }
  let x = 0;
  let y = 0;
  for (let i = start; i < end; i++) {
    x += points[i].x;
    y += points[i].y;
  }
  return { x: x / count, y: y / count };
};

/**
 * Largest Triangle Three Buckets (LTTB) downsample: O(n), keeps first/last points
 * and spikes that even-index sampling would drop.
 */
export const downsampleSparklinePoints = (
  points: ChangePointSeriesPoint[]
): ChangePointSeriesPoint[] => {
  const { length } = points;
  if (length <= SPARKLINE_MAX_POINTS) {
    return points;
  }

  const sampled: ChangePointSeriesPoint[] = [points[0]];
  const bucketSize = (length - 2) / (SPARKLINE_MAX_POINTS - 2);
  let previousIndex = 0;

  for (let i = 0; i < SPARKLINE_MAX_POINTS - 2; i++) {
    const { x: avgX, y: avgY } = averagePoint(
      points,
      Math.floor((i + 1) * bucketSize) + 1,
      Math.min(Math.floor((i + 2) * bucketSize) + 1, length)
    );
    const { x: prevX, y: prevY } = points[previousIndex];
    const bucketStart = Math.floor(i * bucketSize) + 1;
    const bucketEnd = Math.floor((i + 1) * bucketSize) + 1;

    let maxArea = -1;
    let nextIndex = bucketStart;
    for (let j = bucketStart; j < bucketEnd; j++) {
      const { x, y } = points[j];
      const area = Math.abs((prevX - avgX) * (y - prevY) - (prevX - x) * (avgY - prevY));
      if (area > maxArea) {
        maxArea = area;
        nextIndex = j;
      }
    }

    sampled.push(points[nextIndex]);
    previousIndex = nextIndex;
  }

  sampled.push(points[length - 1]);
  return sampled;
};
