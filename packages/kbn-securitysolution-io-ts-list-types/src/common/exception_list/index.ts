/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';

export const exceptionListType = t.keyof({
  detection: null,
  endpoint: null,
  endpoint_trusted_apps: null,
  endpoint_events: null,
  endpoint_host_isolation_exceptions: null,
  endpoint_blocklists: null,
});
export const exceptionListTypeOrUndefined = t.union([exceptionListType, t.undefined]);
export type ExceptionListType = t.TypeOf<typeof exceptionListType>;
export type ExceptionListTypeOrUndefined = t.TypeOf<typeof exceptionListTypeOrUndefined>;
export enum ExceptionListTypeEnum {
  DETECTION = 'detection',
  ENDPOINT = 'endpoint',
  ENDPOINT_TRUSTED_APPS = 'endpoint',
  ENDPOINT_EVENTS = 'endpoint_events',
  ENDPOINT_HOST_ISOLATION_EXCEPTIONS = 'endpoint_host_isolation_exceptions',
  ENDPOINT_BLOCKLISTS = 'endpoint_blocklists',
}
