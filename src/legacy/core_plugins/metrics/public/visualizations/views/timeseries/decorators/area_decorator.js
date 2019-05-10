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
import { getSpecId, getGroupId, ScaleType, AreaSeries } from '@elastic/charts';
import { getSeriesColors, getAreaSeriesStyles } from '../utils/series_styles';

export function AreaSeriesDecorator({
  seriesId,
  groupId,
  name,
  data,
  hideInLegend,
  lines,
  color,
  stack,
  points,
  xScaleType,
  yScaleType,
}) {
  const id = getSpecId(seriesId);
  const seriesStyle = getAreaSeriesStyles({ points, lines, color });
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
    customSeriesColors: getSeriesColors(color, id),
  };

  return (
    <AreaSeries {...seriesSettings} />
  );
}

AreaSeriesDecorator.propTypes = {
  seriesId: PropTypes.string.isRequired,
  groupId: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  data: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired,
  hideInLegend: PropTypes.bool.isRequired,
  lines: PropTypes.shape({
    fill: PropTypes.number,
    lineWidth: PropTypes.number,
    show: PropTypes.bool,
    steps: PropTypes.bool,
  }).isRequired,
  color: PropTypes.string.isRequired,
  stack: PropTypes.bool.isRequired,
  points: PropTypes.shape({
    lineWidth: PropTypes.number,
    radius: PropTypes.number,
    show: PropTypes.bool,
  }).isRequired,
  xScaleType: PropTypes.string,
  yScaleType: PropTypes.string,
};

AreaSeriesDecorator.defaultProps = {
  yScaleType: ScaleType.Linear,
  xScaleType: ScaleType.Time,
};
