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
