/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import {
  ThresholdLineConfig,
  ThresholdLine,
  ThresholdLineStyle,
  AxisConfig,
  SeriesParam,
  YScaleType,
} from '../types';

export function getThresholdLine(
  { style, ...rest }: ThresholdLine,
  yAxes: Array<AxisConfig<YScaleType>>,
  seriesParams: SeriesParam[]
): ThresholdLineConfig {
  const groupId = yAxes.find(({ id }) => seriesParams.some(({ valueAxis }) => id === valueAxis))
    ?.groupId;

  return {
    ...rest,
    dash: getDash(style),
    groupId,
  };
}

function getDash(style: ThresholdLineStyle): number[] | undefined {
  switch (style) {
    case ThresholdLineStyle.Dashed:
      return [10, 5];
    case ThresholdLineStyle.DotDashed:
      return [20, 5, 5, 5];
    case ThresholdLineStyle.Full:
    default:
      return;
  }
}
