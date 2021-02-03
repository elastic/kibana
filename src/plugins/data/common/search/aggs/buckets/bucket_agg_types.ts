/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export enum BUCKET_TYPES {
  FILTER = 'filter',
  FILTERS = 'filters',
  HISTOGRAM = 'histogram',
  IP_RANGE = 'ip_range',
  DATE_RANGE = 'date_range',
  RANGE = 'range',
  TERMS = 'terms',
  SIGNIFICANT_TERMS = 'significant_terms',
  GEOHASH_GRID = 'geohash_grid',
  GEOTILE_GRID = 'geotile_grid',
  DATE_HISTOGRAM = 'date_histogram',
}
