/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { HttpStart } from 'src/core/public';
import { LegacyFetchHandlers } from '../../../common/search/search_source';

/**
 * Wrapper for calling the internal msearch endpoint from the client.
 * This is needed to abstract away differences in the http service
 * between client & server.
 *
 * @internal
 */
export function getCallMsearch({ http }: { http: HttpStart }): LegacyFetchHandlers['callMsearch'] {
  return async ({ body, signal }) => {
    return http.post('/internal/_msearch', {
      body: JSON.stringify(body),
      signal,
    });
  };
}
