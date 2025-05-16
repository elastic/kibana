/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PANEL_TYPES, TIME_RANGE_DATA_MODES, TIME_RANGE_MODE_KEY } from '../../../../common/enums';
import type { Series, Panel } from '../../../../common/types';

const OVERRIDE_INDEX_PATTERN_KEY = 'override_index_pattern';

/**
 * Check if passed 'series' has overridden index pattern or not.
 * @private
 */
const hasOverriddenIndexPattern = (series?: Series) =>
  Boolean(series?.[OVERRIDE_INDEX_PATTERN_KEY]);

/**
 * Get value of Time Range Mode for panel
 * @private
 */
const getPanelTimeRangeMode = (panel: Panel) => panel[TIME_RANGE_MODE_KEY];

/**
 * Get value of Time Range Mode for series
 * @private
 */
const getSeriesTimeRangeMode = (series: Series) => series[TIME_RANGE_MODE_KEY];

/**
 * Check if 'Entire Time Range' mode active or not.
 * @public
 */
export const isEntireTimeRangeMode = (panel: Panel, series?: Series) => {
  if (panel.type === PANEL_TYPES.TIMESERIES) {
    return false;
  }

  const timeRangeMode =
    series && hasOverriddenIndexPattern(series)
      ? getSeriesTimeRangeMode(series)
      : getPanelTimeRangeMode(panel);

  return timeRangeMode === TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE;
};

/**
 * Check if 'Last Value Time Range' mode active or not.
 * @public
 **/
export const isLastValueTimerangeMode = (panel: Panel, series?: Series) =>
  !isEntireTimeRangeMode(panel, series);
