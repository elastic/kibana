/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { AreaSeries, ScaleType, CurveType } from '@elastic/charts';

export function AreaSeriesComponent({ data, index }: { data: any; index: number }) {
  const lines = data.lines || {};
  const points = data.points || {};
  const styles = {
    areaSeriesStyle: {
      line: {
        stroke: data.color,
        strokeWidth: Number(lines.lineWidth) ?? 3,
        visible: lines.show ?? !points.show,
      },
      area: {
        fill: data.color,
        opacity: lines.fill ?? 0,
        visible: lines.show ?? !points.show,
      },
      point: {
        fill: points.fillColor,
        opacity: points.fill * 10 ?? 10,
        radius: points.radius ?? 3,
        stroke: data.color,
        strokeWidth: points.lineWidth ?? 2,
        visible: points.show ?? false,
        shape: points.symbol === 'cross' ? 'x' : points.symbol,
      },
    },
    curve: lines.steps ? CurveType.CURVE_STEP : CurveType.LINEAR,
  };

  return (
    <AreaSeries
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
