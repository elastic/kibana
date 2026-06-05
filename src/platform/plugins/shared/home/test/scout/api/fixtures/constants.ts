/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';

export const FLIGHTS_DATASET_ID = 'flights';

export const FLIGHTS_ES_INDEX = 'kibana_sample_data_flights';

// @see src/platform/plugins/shared/home/server/services/sample_data/data_sets/flights/index.ts
export const FLIGHTS_OVERVIEW_DASHBOARD_ID = '7adfa750-4c81-11e8-b3d7-01146121b73d';

export const COMMON_HEADERS = {
  'kbn-xsrf': 'kibana',
  [X_ELASTIC_INTERNAL_ORIGIN_REQUEST]: 'kibana',
} as const;

// Earliest-to-latest timestamp delta in the flights dataset; used to verify timestamps shift relative to install time.
// @see src/platform/plugins/shared/home/server/services/sample_data/data_sets/flights/flights.json.gz
export const FLIGHTS_DATA_TIME_SPAN_MS =
  new Date('2018-02-11T14:54:34').getTime() - new Date('2018-01-01T00:00:00').getTime();
