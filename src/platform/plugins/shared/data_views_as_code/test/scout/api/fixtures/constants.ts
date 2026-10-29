/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  [ELASTIC_HTTP_VERSION_HEADER]: '2023-10-31',
};

export const BASE_PATH = '/api/data_views/v2';

export const ID_OVER_MAX_LENGTH = 'x'.repeat(1759);
