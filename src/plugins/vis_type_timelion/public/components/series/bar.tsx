/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { BarSeries, ScaleType } from '@elastic/charts';
import { Series } from '../../../common/vis_data';

interface BarSeriesComponentProps {
  index: number;
  visData: Series;
}

export function BarSeriesComponent({
  index,
  visData: { color, data, label, stack, bars = {} },
}: BarSeriesComponentProps) {
  let opacity = bars.fill;

  if (!bars.fill) {
    opacity = 1;
  } else if (bars.fill < 0) {
    opacity = 0;
  } else if (bars.fill > 1) {
    opacity = 1;
  }

  const styles = {
    barSeriesStyle: {
      rect: {
        fill: color,
        opacity,
        widthPixel: bars.lineWidth,
      },
    },
  };

  return (
    <BarSeries
      id={index + label}
      groupId={`${index}`}
      name={label}
      xScaleType={ScaleType.Time}
      yScaleType={ScaleType.Linear}
      xAccessor={0}
      yAccessors={[1]}
      data={data}
      sortIndex={index}
      color={color}
      stackAccessors={stack ? [0] : undefined}
      {...styles}
    />
  );
}
