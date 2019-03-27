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
  AreaSeries,
  ScaleType,
  CurveType
} from '@elastic/charts';
import { calculateFillColor } from '../lib/calculate_fill_color';

export const Series = ({ label, data, bars, lines, color, mode }) => {
  const specId = getSpecId(label);
  const lineCustomSeriesColors = new Map();
  const lineDataSeriesColorValues = {
    colorValues: [],
    specId,
  };

  const { fill } = bars;
  const { steps } = lines;

  lineCustomSeriesColors.set(lineDataSeriesColorValues, calculateFillColor(color, fill).fillColor);

  return (
    <AreaSeries
      id={specId}
      seriesType={bars.show ? 'bar' : 'area'}
      xScaleType={ScaleType.Time}
      yScaleType={mode}
      xAccessor={0}
      yAccessors={[1]}
      data={data}
      yScaleToDataExtent={false}
      customSeriesColors={lineCustomSeriesColors}
      curve={steps ? CurveType.CURVE_STEP : CurveType.LINEAR}
    />
  );
};

Series.defaultProps = {
  mode: ScaleType.Linear,
};

Series.propTypes = {
  label: PropTypes.node,
  data: PropTypes.array,
  bars: PropTypes.object,
  lines: PropTypes.object,
  color: PropTypes.string,
};
