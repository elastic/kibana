/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// eslint-disable-next-line @kbn/imports/no_boundary_crossing
import { hapiMocks } from '@kbn/hapi-mocks';
import { ApiVersion, ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { CoreKibanaRequest } from '../request';
import { passThroughValidation } from './core_versioned_route';

export function createRequest(
  {
    version,
    body,
    params,
    query,
  }: { version: undefined | ApiVersion; body?: object; params?: object; query?: object } = {
    version: '1',
  }
) {
  return CoreKibanaRequest.from(
    hapiMocks.createRequest({
      payload: body,
      params,
      query,
      headers: { [ELASTIC_HTTP_VERSION_HEADER]: version },
      app: { requestId: 'fakeId' },
    }),
    passThroughValidation
  );
}
