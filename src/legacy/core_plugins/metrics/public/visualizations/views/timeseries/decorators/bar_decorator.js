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
import PropTypes from 'prop-types';
import { getSpecId, getGroupId, ScaleType, BarSeries } from '@elastic/charts';
import { calculateCustomSeriesColors, getBarSeriesStyles } from '../utils/series_styles';

export function BarSeriesDecorator({
  seriesId,
  groupId,
  name,
  data,
  hideInLegend,
  bars,
  color,
  stack,
  xScaleType,
  yScaleType,
}) {
  const id = getSpecId(seriesId);
  const seriesStyle = getBarSeriesStyles(bars, color);
  const seriesSettings = {
    id,
    groupId: getGroupId(groupId),
    name,
    data,
    hideInLegend,
    ...seriesStyle,
    xAccessor: 0,
    yAccessors: [1],
    // todo: props.stack ???
    stackAccessors: stack ? [0] : null,
    xScaleType,
    yScaleType,
    yScaleToDataExtent: false,
    customSeriesColors: calculateCustomSeriesColors(color, id),
  };

  return (
    <BarSeries {...seriesSettings} />
  );
}

BarSeriesDecorator.propTypes = {
  seriesId: PropTypes.string.isRequired,
  groupId: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  data: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired,
  hideInLegend: PropTypes.bool.isRequired,
  bars: PropTypes.shape({
    fill: PropTypes.number,
    lineWidth: PropTypes.number,
    show: PropTypes.boolean,
  }),
  color: PropTypes.string.isRequired,
  stack: PropTypes.bool.isRequired,
  xScaleType: PropTypes.string,
  yScaleType: PropTypes.string,
};

BarSeriesDecorator.defaultProps = {
  yScaleType: ScaleType.Linear,
  xScaleType: ScaleType.Time,
};
