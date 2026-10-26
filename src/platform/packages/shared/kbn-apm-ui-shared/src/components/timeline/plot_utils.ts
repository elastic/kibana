/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { scaleLinear } from 'd3-scale';
import type { Margins } from '.';

export type PlotValues = ReturnType<typeof getPlotValues>;

export function getPlotValues({
  width,
  xMin = 0,
  xMax,
  margins,
  numberOfTicks = 7,
}: {
  width: number;
  xMin?: number;
  xMax: number;
  margins: Margins;
  numberOfTicks?: number;
}) {
  const xScale = scaleLinear()
    .domain([xMin, xMax])
    .range([margins.left, width - margins.right]);

  return {
    margins,
    tickValues: xScale.ticks(numberOfTicks),
    width,
    xDomain: xScale.domain(),
    xMax,
    xScale,
  };
}
