/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { omitBy, isPlainObject, isEmpty } from 'lodash';

interface KibanaRequestParams {
  body?: unknown;
  query?: unknown;
  params?: unknown;
}

export function stripNullishRequestParameters(params: KibanaRequestParams) {
  return omitBy<{ path: any; body: any; query: any }>(
    {
      path: params.params,
      query: params.query,
      body: params.body,
    },
    (val) => val === null || val === undefined || (isPlainObject(val) && isEmpty(val))
  );
}
