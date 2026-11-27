/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';

export const UI_COUNTERS_REPORT_PATH = '/api/ui_counters/_report';

export const INTERNAL_HEADERS = {
  'kbn-xsrf': 'scout',
  'content-type': 'application/json',
  [X_ELASTIC_INTERNAL_ORIGIN_REQUEST]: 'kibana',
  [ELASTIC_HTTP_VERSION_HEADER]: '1',
};

export const UI_COUNTERS_APP_NAME = 'myApp';
export const USAGE_COUNTER_SAVED_OBJECT_TYPE = 'usage-counter';
export const UI_METRIC_SAVED_OBJECT_TYPE = 'ui-metric';
// Usage counters are buffered for 5s by default and then written without a refresh.
export const USAGE_COUNTER_STORED_TIMEOUT = 30_000;
