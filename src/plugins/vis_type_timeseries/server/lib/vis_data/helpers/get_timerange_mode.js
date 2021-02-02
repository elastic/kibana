/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import {
  TIME_RANGE_DATA_MODES,
  TIME_RANGE_MODE_KEY,
} from '../../../../common/timerange_data_modes';
import { PANEL_TYPES } from '../../../../common/panel_types';

const OVERRIDE_INDEX_PATTERN_KEY = 'override_index_pattern';

/**
 * Check if passed 'series' has overridden index pattern or not.
 * @private
 * @param series - specific series
 * @return {boolean}
 */
const hasOverriddenIndexPattern = (series) => Boolean(series[OVERRIDE_INDEX_PATTERN_KEY]);

/**
 * Get value of Time Range Mode for panel
 * @private
 * @param panel - panel configuration
 * @return {string} - value of TIME_RANGE_DATA_MODES type
 */
const getPanelTimeRangeMode = (panel) => panel[TIME_RANGE_MODE_KEY];

/**
 * Get value of Time Range Mode for series
 * @private
 * @param series - specific series
 * @return {string} - value of TIME_RANGE_DATA_MODES type
 */
const getSeriesTimeRangeMode = (series) => series[TIME_RANGE_MODE_KEY];

/**
 * Check if 'Entire Time Range' mode active or not.
 * @public
 * @param panel - panel configuration
 * @param series - specific series
 * @return {boolean}
 */
export const isEntireTimeRangeMode = (panel, series = {}) => {
  if (panel.type === PANEL_TYPES.TIMESERIES) {
    return false;
  }

  const timeRangeMode = hasOverriddenIndexPattern(series)
    ? getSeriesTimeRangeMode(series)
    : getPanelTimeRangeMode(panel);

  return timeRangeMode === TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE;
};

/**
 * Check if 'Last Value Time Range' mode active or not.
 * @public
 * @param panel - panel configuration
 * @param series - specific series
 * @return {boolean}
 */
export const isLastValueTimerangeMode = (panel, series) => !isEntireTimeRangeMode(panel, series);
