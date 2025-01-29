/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { BarSeries, ScaleType, BarSeriesStyle } from '@elastic/charts';
import type { VisSeries } from '../../../common/vis_data';

interface BarSeriesComponentProps {
  index: number;
  visData: VisSeries;
  groupId: string;
}

const getBarSeriesStyle = ({ color, bars }: BarSeriesComponentProps['visData']) => {
  let opacity = bars.fill ?? 1;

  if (opacity < 0) {
    opacity = 0;
  } else if (opacity > 1) {
    opacity = 1;
  }

  return {
    rectBorder: {
      visible: false,
    },
    rect: {
      fill: color,
      opacity,
      widthPixel: Math.max(1, bars.lineWidth ?? 1),
    },
  } as BarSeriesStyle;
};

export const BarSeriesComponent = ({ index, groupId, visData }: BarSeriesComponentProps) => (
  <BarSeries
    id={index + visData.label}
    groupId={groupId}
    name={visData.label}
    xScaleType={ScaleType.Time}
    yScaleType={ScaleType.Linear}
    xAccessor={0}
    yAccessors={[1]}
    data={visData._hide ? [] : visData.data}
    enableHistogramMode={false}
    color={visData.color}
    stackAccessors={visData.stack ? [0] : undefined}
    barSeriesStyle={getBarSeriesStyle(visData)}
  />
);
