/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const FIELD_VALUE_SEPARATOR = String.fromCharCode(0x1d);

// Full screen classes
export const METRICS_GRID_CLASS = 'metricsGrid';
export const METRICS_GRID_WRAPPER_FULL_SCREEN_CLASS = 'metricsGridWrapper--fullScreen';
export const METRICS_GRID_FULL_SCREEN_CLASS = `${METRICS_GRID_CLASS}--fullScreen`;
export const METRICS_GRID_RESTRICT_BODY_CLASS = `${METRICS_GRID_CLASS}--restrictBody`;

// data-test-subj
export const METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ = 'metricsExperienceBreakdownSelector';
export const METRICS_VALUES_SELECTOR_DATA_TEST_SUBJ = 'metricsExperienceValuesSelector';

// Selection limits
export const MAX_VALUES_SELECTIONS = 10;
export const MAX_DIMENSIONS_SELECTIONS = 1;
export const PAGE_SIZE = 20;
