/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export enum BUCKET_TYPES {
  FILTER = 'filter',
  FILTERS = 'filters',
  HISTOGRAM = 'histogram',
  IP_RANGE = 'ip_range',
  DATE_RANGE = 'date_range',
  RANGE = 'range',
  TERMS = 'terms',
  MULTI_TERMS = 'multi_terms',
  RARE_TERMS = 'rare_terms',
  SIGNIFICANT_TERMS = 'significant_terms',
  SIGNIFICANT_TEXT = 'significant_text',
  GEOHASH_GRID = 'geohash_grid',
  GEOTILE_GRID = 'geotile_grid',
  DATE_HISTOGRAM = 'date_histogram',
  SAMPLER = 'sampler',
  DIVERSIFIED_SAMPLER = 'diversified_sampler',
}
