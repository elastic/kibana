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
import {
  getSpecId,
  getGroupId,
  AreaSeries,
  BarSeries,
  ScaleType,
  CurveType
} from '@elastic/charts';
import { calculateFillColor } from '../lib/calculate_fill_color';

export const Series = ({
  mode,
  id,
  groupId,
  label,
  data,
  bars,
  lines,
  color,
}) => {
  const { fill: barFill, show: isBarSeries } = bars;
  const { fill: lineFill, steps } = lines;
  const Component = isBarSeries ? BarSeries : AreaSeries;
  const specId = getSpecId(label + id);
  const customSeriesColors = new Map();
  const dataSeriesColorValues = {
    colorValues: [],
    specId,
  };

  customSeriesColors.set(
    dataSeriesColorValues,
    calculateFillColor(color, isBarSeries ? barFill : lineFill).fillColor
  );

  return (
    <Component
      id={specId}
      groupId={getGroupId(groupId)}
      xScaleType={ScaleType.Time}
      yScaleType={mode}
      xAccessor={0}
      yAccessors={[1]}
      data={data}
      yScaleToDataExtent={false}
      customSeriesColors={customSeriesColors}
      curve={steps ? CurveType.CURVE_STEP : CurveType.LINEAR}
    />
  );
};

Series.defaultProps = {
  mode: ScaleType.Linear,
  bars: {},
  lines: {},
};

Series.propTypes = {
  hideInLegend: PropTypes.bool,
  id: PropTypes.string,
  mode: PropTypes.string,
  groupId: PropTypes.string,
  label: PropTypes.node,
  data: PropTypes.array,
  bars: PropTypes.object,
  lines: PropTypes.object,
  color: PropTypes.string,
};
