/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// @ts-ignore
import chroma from 'chroma-js';
import React from 'react';
import {
  AreaSeries,
  ScaleType,
  CurveType,
  AreaSeriesStyle,
  PointShape,
  RecursivePartial,
} from '@elastic/charts';
import type { VisSeries } from '../../../common/vis_data';

interface AreaSeriesComponentProps {
  index: number;
  visData: VisSeries;
  groupId: string;
}

const isShowLines = (lines: VisSeries['lines'], points: VisSeries['points']) =>
  lines?.show ? true : points?.show ? false : true;

const getPointFillColor = (points: VisSeries['points'], color: string | undefined) => {
  const pointFillColor = points?.fillColor || points?.fill === undefined ? 'white' : color;
  return (
    pointFillColor &&
    chroma(pointFillColor)
      .alpha(points?.fill ?? 1)
      .css()
  );
};

const getAreaSeriesStyle = ({
  color,
  lines,
  points,
}: AreaSeriesComponentProps['visData']): RecursivePartial<AreaSeriesStyle> => ({
  line: {
    opacity: isShowLines(lines, points) ? 1 : 0,
    stroke: color,
    strokeWidth: lines?.lineWidth !== undefined ? Number(lines.lineWidth) : 3,
    visible: isShowLines(lines, points),
  },
  area: {
    fill: color,
    opacity: lines?.fill ?? 0,
    visible: lines?.show ?? points?.show ?? true,
  },
  point: {
    fill: getPointFillColor(points, color),
    opacity: 1,
    radius: points?.radius ?? 3,
    stroke: color,
    strokeWidth: points?.lineWidth ?? 2,
    visible: points?.show ?? false,
    shape: points?.symbol === 'cross' ? PointShape.X : points?.symbol,
  },
});

export const AreaSeriesComponent = ({ index, groupId, visData }: AreaSeriesComponentProps) => (
  <AreaSeries
    id={index + visData.label}
    groupId={groupId}
    name={visData.label}
    xScaleType={ScaleType.Time}
    yScaleType={ScaleType.Linear}
    xAccessor={0}
    yAccessors={[1]}
    data={visData._hide ? [] : visData.data}
    sortIndex={index}
    color={visData.color}
    curve={visData.lines?.steps ? CurveType.CURVE_STEP : CurveType.LINEAR}
    stackAccessors={visData.stack ? [0] : undefined}
    areaSeriesStyle={getAreaSeriesStyle(visData)}
  />
);
