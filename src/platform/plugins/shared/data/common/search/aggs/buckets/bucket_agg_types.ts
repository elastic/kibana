/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export enum BUCKET_TYPES {
  FILTER = 'filter',
  FILTERS = 'filters',
  HISTOGRAM = 'histogram',
  IP_PREFIX = 'ip_prefix',
  IP_RANGE = 'ip_range',
  DATE_RANGE = 'date_range',
  RANGE = 'range',
  TERMS = 'terms',
  MULTI_TERMS = 'multi_terms',
  RARE_TERMS = 'rare_terms',
  SIGNIFICANT_TERMS = 'significant_terms',
  SIGNIFICANT_TEXT = 'significant_text',
  GEOTILE_GRID = 'geotile_grid',
  DATE_HISTOGRAM = 'date_histogram',
  SAMPLER = 'sampler',
  DIVERSIFIED_SAMPLER = 'diversified_sampler',
  TIME_SERIES = 'time_series',
}
