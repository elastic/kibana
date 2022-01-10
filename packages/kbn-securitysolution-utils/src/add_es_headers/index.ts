/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const ES_CLIENT_HEADERS = {
  'x-elastic-product-origin': 'security',
} as const;

export const createEsClientCallWithHeaders = <T>({
  addOriginHeader,
  request,
}: {
  addOriginHeader: boolean;
  request: T & { headers?: Record<string, unknown> };
}): T => {
  if (addOriginHeader) {
    return {
      ...request,
      headers: {
        ...request.headers,
        ...ES_CLIENT_HEADERS,
      },
    };
  } else {
    return request;
  }
};
