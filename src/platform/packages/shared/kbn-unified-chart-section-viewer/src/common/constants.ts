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
export const METRICS_GRID_FULL_SCREEN_CLASS = `${METRICS_GRID_CLASS}--fullScreen`;
export const METRICS_GRID_RESTRICT_BODY_CLASS = `${METRICS_GRID_CLASS}--restrictBody`;

// data-test-subj
export const METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ = 'metricsExperienceBreakdownSelector';
export const METRICS_GRID_PAGINATION_DATA_TEST_SUBJ = 'metricsExperienceGridPagination';

// Selection limits
export const MAX_DIMENSIONS_SELECTIONS = 5;
export const PAGE_SIZE = 20;

// Debounce time for dimensions selector
export const DEBOUNCE_TIME = 300;

// Lens extra actions
export const ACTION_COPY_TO_DASHBOARD = 'ACTION_METRICS_EXPERIENCE_COPY_TO_DASHBOARD';
export const ACTION_VIEW_DETAILS = 'ACTION_METRICS_EXPERIENCE_VIEW_DETAILS';
export const ACTION_EXPLORE_IN_DISCOVER_TAB = 'ACTION_METRICS_EXPERIENCE_EXPLORE_IN_DISCOVER_TAB';
export const ACTION_OPEN_IN_DISCOVER = 'ACTION_OPEN_IN_DISCOVER';
// Note: `ACTION_INSPECT_PANEL` is the canonical inspect-panel action ID and is owned
// by the embeddable plugin. Consumers should import it directly from
// `@kbn/embeddable-plugin/public` rather than re-exporting it from here.
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

// Metric instrument types allowed in the Metrics experience.
export const ALLOWED_METRIC_TYPES = ['gauge', 'counter', 'histogram'];

export const FEATURE_FLAGS = {
  IS_EDIT_GRID_SETTINGS_ENABLED: 'discover.metricsExperienceEditGridSettingsEnabled',
  IS_SORTING_ENABLED: 'discover.metricsExperienceSortEnabled',
} as const;

export type FeatureFlag = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];

// Fallback values used when a feature flag is not configured externally
export const FEATURE_FLAG_DEFAULTS: Record<FeatureFlag, boolean> = {
  [FEATURE_FLAGS.IS_EDIT_GRID_SETTINGS_ENABLED]: false,
  [FEATURE_FLAGS.IS_SORTING_ENABLED]: false,
};

// Metrics grid sort options
export const METRICS_SORT_BY = {
  alphabetically: 'alphabetically',
} as const;

// Metrics grid sort directions
export const METRICS_SORT_DIRECTION = {
  asc: 'asc',
  desc: 'desc',
} as const;

// Default metrics grid sort
export const DEFAULT_METRICS_SORT = [
  METRICS_SORT_BY.alphabetically,
  METRICS_SORT_DIRECTION.asc,
] as const;
