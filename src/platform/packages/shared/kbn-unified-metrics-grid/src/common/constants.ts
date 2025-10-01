/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { ES_FIELD_TYPES } from '@kbn/field-types';

export const FIELD_VALUE_SEPARATOR = String.fromCharCode(0x1d);

// Full screen classes
export const METRICS_GRID_WRAPPER_FULL_SCREEN_CLASS = 'metricsExperienceGridWrapper--fullScreen';
export const METRICS_GRID_FULL_SCREEN_CLASS = 'metricsExperienceGrid--fullScreen';
export const METRICS_GRID_RESTRICT_BODY_CLASS = 'metricsExperienceGrid--restrictBody';

// Selection limits
export const MAX_VALUES_SELECTIONS = 10;
export const MAX_DIMENSIONS_SELECTIONS = 10;
export const PAGE_SIZE = 20;

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
