/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';

export const ESE_API_PATH = '/internal/search/ese';
export const TEST_INDEX = 'search-api-test';
export const TEST_DOC_ID = 'search-api-test-doc';
export const FAKE_ASYNC_ID = 'FkxOb21iV1g2VGR1S2QzaWVtRU9fMVEbc3JWeWc1VHlUdDZ6MENxcXlYVG1Fdzo2NDg4';

export const COMMON_HEADERS: Record<string, string> = {
  [ELASTIC_HTTP_VERSION_HEADER]: '1',
  'x-elastic-internal-origin': 'kibana',
  'kbn-xsrf': 'foo',
};
