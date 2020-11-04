/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import { AreaSeries, ScaleType, CurveType } from '@elastic/charts';

interface AreaSeriesComponentProps {
  data: any;
  index: number;
}

export function AreaSeriesComponent({ data, index }: AreaSeriesComponentProps) {
  const lines = data.lines || {};
  const points = data.points || {};
  const styles = {
    areaSeriesStyle: {
      line: {
        stroke: data.color,
        strokeWidth: Number(lines.lineWidth) || 3,
        visible: lines.show === undefined ? true : lines.show,
      },
      area: {
        fill: data.color,
        opacity: !lines.fill || lines.fill <= 0 ? 0 : lines.fill,
        visible: lines.show === undefined ? true : lines.show,
      },
      point: {
        fill: points.fillColor,
        opacity: !points.fill || points.fill < 0 ? 1 : points.fill,
        radius: points.radius || 3,
        stroke: data.color || '#000',
        strokeWidth: points.lineWidth || 2,
        visible: Boolean(points.show),
      },
    },
    curve: lines.steps ? CurveType.CURVE_STEP : CurveType.LINEAR,
  };

  return (
    <AreaSeries
      id={data.label}
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
