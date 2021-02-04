/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { BarSeries, ScaleType } from '@elastic/charts';

export function BarSeriesComponent({ data, index }: { data: any; index: number }) {
  const bars = data.bars || {};
  const styles = {
    barSeriesStyle: {
      rect: {
        fill: data.color,
        opacity: !bars.fill || bars.fill < 0 ? 1 : bars.fill,
      },
    },
  };

  return (
    <BarSeries
      id={index + data.label}
      name={data.label}
      xScaleType={ScaleType.Time}
      yScaleType={ScaleType.Linear}
      xAccessor={0}
      yAccessors={[1]}
      data={data.data}
      sortIndex={index}
      color={data.color}
      stackAccessors={data.stack ? [0] : undefined}
      {...styles}
    />
  );
}
