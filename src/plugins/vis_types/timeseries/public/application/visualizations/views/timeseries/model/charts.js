/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
  stackMode: PropTypes.oneOf(['percentage', 'wiggle', 'silhouette']),
  stackAccessors: PropTypes.arrayOf(PropTypes.number),
  xScaleType: PropTypes.string,
  yScaleType: PropTypes.string,
  timeZone: PropTypes.string.isRequired,
  enableHistogramMode: PropTypes.bool.isRequired,
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
