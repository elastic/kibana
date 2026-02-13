/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ES_FIELD_TYPES } from '@kbn/field-types';

// Full screen classes
export const METRICS_GRID_CLASS = 'metricsGrid';
export const METRICS_GRID_WRAPPER_FULL_SCREEN_CLASS = 'metricsGridWrapper--fullScreen';
export const METRICS_GRID_FULL_SCREEN_CLASS = `${METRICS_GRID_CLASS}--fullScreen`;
export const METRICS_GRID_RESTRICT_BODY_CLASS = `${METRICS_GRID_CLASS}--restrictBody`;

// data-test-subj
export const METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ = 'metricsExperienceBreakdownSelector';

// Selection limits
export const MAX_DIMENSIONS_SELECTIONS = 1;
export const PAGE_SIZE = 20;

// Debounce time for dimensions selector
export const DEBOUNCE_TIME = 300;

// Lens extra actions
export const ACTION_COPY_TO_DASHBOARD = 'ACTION_METRICS_EXPERIENCE_COPY_TO_DASHBOARD';
export const ACTION_VIEW_DETAILS = 'ACTION_METRICS_EXPERIENCE_VIEW_DETAILS';
export const ACTION_EXPLORE_IN_DISCOVER_TAB = 'ACTION_METRICS_EXPERIENCE_EXPLORE_IN_DISCOVER_TAB';
export const ACTION_OPEN_IN_DISCOVER = 'ACTION_OPEN_IN_DISCOVER';
/** Set of numeric field types used for metrics */
export const NUMERIC_TYPES = [
  ES_FIELD_TYPES.LONG,
  ES_FIELD_TYPES.INTEGER,
  ES_FIELD_TYPES.SHORT,
  ES_FIELD_TYPES.BYTE,
  ES_FIELD_TYPES.DOUBLE,
  ES_FIELD_TYPES.FLOAT,
  ES_FIELD_TYPES.HALF_FLOAT,
  ES_FIELD_TYPES.SCALED_FLOAT,
  ES_FIELD_TYPES.UNSIGNED_LONG,
  ES_FIELD_TYPES.HISTOGRAM,
  ES_FIELD_TYPES.EXPONENTIAL_HISTOGRAM,
  ES_FIELD_TYPES.TDIGEST,
];

// For the dimensions, the field MUST have `time_series_dimension` attribute set
// in the mappings and it can only be the following types:
export const DIMENSION_TYPES = [
  ES_FIELD_TYPES.KEYWORD,
  ES_FIELD_TYPES.IP,
  ES_FIELD_TYPES.BOOLEAN,
  ES_FIELD_TYPES.LONG,
  ES_FIELD_TYPES.INTEGER,
  ES_FIELD_TYPES.SHORT,
  ES_FIELD_TYPES.BYTE,
  ES_FIELD_TYPES.UNSIGNED_LONG,
];
