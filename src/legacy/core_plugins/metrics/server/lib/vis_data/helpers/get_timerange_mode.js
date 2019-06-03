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

import { TIME_RANGE_DATA_MODES } from '../../../../common/timerange_data_modes';
import { PANEL_TYPES } from '../../../../common/panel_types';

const TIME_RANGE_MODE_KEY = 'time_range_mode';
const OVERRIDE_INDEX_PATTERN_KEY = 'override_index_pattern';

const hasOverriddenIndexPattern = series => Boolean(series[OVERRIDE_INDEX_PATTERN_KEY]);
const getPanelTimeRangeMode = panel => panel[TIME_RANGE_MODE_KEY];
const getSeriesTimeRangeMode = series => series[TIME_RANGE_MODE_KEY];

const shouldUseEntireTimeRangeMode = (panel, series = {}) => {
  if (panel.type === PANEL_TYPES.TIMESERIES) {
    return false;
  }

  const timeRangeMode = hasOverriddenIndexPattern(series) ?
    getSeriesTimeRangeMode(series) :
    getPanelTimeRangeMode(panel);

  return timeRangeMode === TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE;
};

const getTimerangeMode = (panel, series) => shouldUseEntireTimeRangeMode(panel, series) ?
  TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE :
  TIME_RANGE_DATA_MODES.LAST_VALUE;

export const isLastValueTimerangeMode = (panel, series) =>
  getTimerangeMode(panel, series) === TIME_RANGE_DATA_MODES.LAST_VALUE;
