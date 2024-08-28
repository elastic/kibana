/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const COMMON_REQUEST_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
};

// possible change in 9.0 to match serverless
const STATEFUL_INTERNAL_REQUEST_HEADERS = {
  ...COMMON_REQUEST_HEADERS,
};

const SERVERLESS_INTERNAL_REQUEST_HEADERS = {
  ...COMMON_REQUEST_HEADERS,
  'x-elastic-internal-origin': 'kibana',
};

export type InternalRequestHeader =
  | typeof STATEFUL_INTERNAL_REQUEST_HEADERS
  | typeof SERVERLESS_INTERNAL_REQUEST_HEADERS;

export const getServerlessInternalRequestHeaders = (): InternalRequestHeader => {
  return SERVERLESS_INTERNAL_REQUEST_HEADERS;
};

export const getStatefulInternalRequestHeaders = (): InternalRequestHeader => {
  return STATEFUL_INTERNAL_REQUEST_HEADERS;
};
