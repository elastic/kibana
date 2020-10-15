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
  useDefaultGroupDomain,
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
    useDefaultGroupDomain,
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
