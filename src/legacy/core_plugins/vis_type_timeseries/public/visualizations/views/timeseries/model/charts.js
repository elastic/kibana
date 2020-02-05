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

import PropTypes from 'prop-types';

const Chart = {
  seriesId: PropTypes.string.isRequired,
  seriesGroupId: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  /**
   * @example
   * [[1556917200000, 6], [1556231200000, 16]]
   */
  data: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired,
  hideInLegend: PropTypes.bool.isRequired,
  color: PropTypes.string.isRequired,
  stackAsPercentage: PropTypes.bool.isRequired,
  stackAccessors: PropTypes.arrayOf(PropTypes.number),
  xScaleType: PropTypes.string,
  yScaleType: PropTypes.string,
  timeZone: PropTypes.string.isRequired,
  enableHistogramMode: PropTypes.bool.isRequired,
  useDefaultGroupDomain: PropTypes.bool,
  sortIndex: PropTypes.number,
};

const BarChart = {
  ...Chart,
  bars: PropTypes.shape({
    fill: PropTypes.number,
    lineWidth: PropTypes.number,
    show: PropTypes.boolean,
  }).isRequired,
};

const AreaChart = {
  ...Chart,
  lines: PropTypes.shape({
    fill: PropTypes.number,
    lineWidth: PropTypes.number,
    show: PropTypes.bool,
    steps: PropTypes.oneOfType([PropTypes.number, PropTypes.bool]),
  }).isRequired,
  points: PropTypes.shape({
    lineWidth: PropTypes.number,
    radius: PropTypes.number,
    show: PropTypes.bool,
  }).isRequired,
};

export const ChartsEntities = {
  BarChart,
  AreaChart,
};
