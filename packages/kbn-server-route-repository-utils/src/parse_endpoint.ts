/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';

export function parseEndpoint(endpoint: string) {
  const parts = endpoint.split(' ');

  const method = parts[0].trim().toLowerCase() as Method;
  const pathname = parts[1].trim();
  const version = parts[2]?.trim();

  if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
    throw new Error(`Endpoint ${endpoint} was not prefixed with a valid HTTP method`);
  }

  if (!version && pathname.startsWith('/api')) {
    throw new Error(`Missing version for public endpoint ${endpoint}`);
  }

  return { method, pathname, version };
}
