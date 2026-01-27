/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const INDEX_PATTERN_TYPE = 'index-pattern';
export const LENS_DOCUMENT_FIELD_NAME = '___records___';

export const TYPING_DEBOUNCE_TIME = 256;
// Taken from the Visualize editor
export const FROM_PLACEHOLDER = '\u2212\u221E';
export const TO_PLACEHOLDER = '+\u221E';

export const DEFAULT_INTERVAL = 1000;
export const AUTO_BARS = 'auto';
export const MIN_HISTOGRAM_BARS = 1;
export const SLICES = 6;

export const LENS_RANGE_MODES = {
  Range: 'range',
  Histogram: 'histogram',
} as const;
