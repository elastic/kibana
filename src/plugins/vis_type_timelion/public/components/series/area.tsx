/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { AreaSeries, ScaleType, CurveType } from '@elastic/charts';
import { Series } from '../../../common/vis_data';

interface AreaSeriesComponentProps {
  index: number;
  visData: Series;
}

export function AreaSeriesComponent({
  index,
  visData: { lines = {}, points = {}, color, label, data, stack },
}: AreaSeriesComponentProps) {
  const styles = {
    areaSeriesStyle: {
      line: {
        stroke: color,
        strokeWidth: lines.lineWidth !== undefined ? Number(lines.lineWidth) : 3,
        visible: lines.show ?? !points.show,
      },
      area: {
        fill: color,
        opacity: lines.fill ?? 0,
        visible: lines.show ?? !points.show,
      },
      point: {
        fill: points.fillColor,
        opacity: points.lineWidth !== undefined ? (points.fill || 1) * 10 : 10,
        radius: points.radius ?? 3,
        stroke: color,
        strokeWidth: points.lineWidth ?? 2,
        visible: points.show ?? false,
        shape: points.symbol === 'cross' ? 'x' : points.symbol,
      },
    },
    curve: lines.steps ? CurveType.CURVE_STEP : CurveType.LINEAR,
  };

  return (
    <AreaSeries
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
