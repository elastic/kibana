/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RouteMethod } from '@kbn/core-http-server';

const validMethods: RouteMethod[] = ['delete', 'get', 'patch', 'post', 'put'];

export function parseEndpoint(endpoint: string) {
  const parts = endpoint.split(' ');

  const method = parts[0].trim().toLowerCase() as Exclude<RouteMethod, 'options'>;
  const pathname = parts[1].trim();
  const version = parts[2]?.trim();

  if (!validMethods.includes(method)) {
    throw new Error(`Endpoint ${endpoint} was not prefixed with a valid HTTP method`);
  }

  return { method, pathname, version };
}
