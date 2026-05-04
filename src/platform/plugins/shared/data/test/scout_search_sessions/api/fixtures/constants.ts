/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';

export const SESSION_API_PATH = '/internal/session';
export const ESE_API_PATH = '/internal/search/ese';

// Matches INITIAL_SEARCH_SESSION_REST_VERSION from server/search/routes/session.ts
const SESSION_REST_VERSION = '1';

export const SESSION_VERSION_HEADER = {
  [ELASTIC_HTTP_VERSION_HEADER]: SESSION_REST_VERSION,
};

export const COMMON_HEADERS: Record<string, string> = {
  ...SESSION_VERSION_HEADER,
  'kbn-xsrf': 'foo',
};
