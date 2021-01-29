/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { ScaleType, AreaSeries } from '@elastic/charts';
import { getAreaStyles } from '../utils/series_styles';
import { ChartsEntities } from '../model/charts';
import { X_ACCESSOR_INDEX, Y_ACCESSOR_INDEXES, Y0_ACCESSOR_INDEXES } from '../../../constants';

export function AreaSeriesDecorator({
  seriesId,
  seriesGroupId,
  name,
  data,
  hideInLegend,
  lines,
  color,
  stackAccessors,
  stackMode,
  points,
  xScaleType,
  yScaleType,
  timeZone,
  enableHistogramMode,
  sortIndex,
  y1AccessorFormat,
  y0AccessorFormat,
  tickFormat,
}) {
  const id = seriesId;
  const groupId = seriesGroupId;
  const areaSeriesStyle = getAreaStyles({ points, lines, color });

  const seriesSettings = {
    id,
    name,
    groupId,
    data,
    color,
    hideInLegend,
    xAccessor: X_ACCESSOR_INDEX,
    yAccessors: Y_ACCESSOR_INDEXES,
    y0Accessors: lines.mode === 'band' ? Y0_ACCESSOR_INDEXES : undefined,
    y1AccessorFormat,
    y0AccessorFormat,
    stackAccessors,
    stackMode,
    xScaleType,
    yScaleType,
    timeZone,
    enableHistogramMode,
    sortIndex,
    tickFormat,
    ...areaSeriesStyle,
  };

  if (enableHistogramMode) {
    seriesSettings.histogramModeAlignment = 'center';
  }

  return <AreaSeries {...seriesSettings} />;
}

AreaSeriesDecorator.propTypes = ChartsEntities.AreaChart;

AreaSeriesDecorator.defaultProps = {
  yScaleType: ScaleType.Linear,
  xScaleType: ScaleType.Time,
};
