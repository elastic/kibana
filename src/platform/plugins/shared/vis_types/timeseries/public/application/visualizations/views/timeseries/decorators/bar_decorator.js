/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { ScaleType, BarSeries } from '@elastic/charts';
import { getBarStyles } from '../utils/series_styles';
import { ChartsEntities } from '../model/charts';
import { X_ACCESSOR_INDEX, Y_ACCESSOR_INDEXES, Y0_ACCESSOR_INDEXES } from '../../../constants';

export function BarSeriesDecorator({
  seriesId,
  seriesGroupId,
  name,
  data,
  hideInLegend,
  bars,
  color,
  stackAccessors,
  stackMode,
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
  const barSeriesStyle = getBarStyles(bars, color);

  const seriesSettings = {
    id,
    name,
    groupId,
    data,
    color,
    hideInLegend,
    xAccessor: X_ACCESSOR_INDEX,
    yAccessors: Y_ACCESSOR_INDEXES,
    y0Accessors: bars.mode === 'band' ? Y0_ACCESSOR_INDEXES : undefined,
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
    ...barSeriesStyle,
  };

  if (enableHistogramMode) {
    seriesSettings.histogramModeAlignment = 'center';
  }

  return <BarSeries {...seriesSettings} />;
}

BarSeriesDecorator.propTypes = ChartsEntities.BarChart;

BarSeriesDecorator.defaultProps = {
  yScaleType: ScaleType.Linear,
  xScaleType: ScaleType.Time,
};
