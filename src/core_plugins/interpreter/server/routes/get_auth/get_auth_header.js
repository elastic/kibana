/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { insecureAuthRoute } from './insecure_auth_route';

// TODO: OMG. No. Need a better way of setting to this than our wacky route thing.
export function getAuthHeader(request, server) {
  const basePath = server.config().get('server.basePath') || '';
  const fullPath = `${basePath}${insecureAuthRoute}`;

  return server
    .inject({
      method: 'GET',
      url: fullPath,
      headers: request.headers,
    })
    .then(res => res.result);
}
