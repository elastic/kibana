/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

type Method = 'get' | 'post' | 'put' | 'delete';

export function parseEndpoint(endpoint: string) {
  const parts = endpoint.split(' ');

  const method = parts[0].trim().toLowerCase() as Method;
  const pathname = parts[1].trim();

  if (!['get', 'post', 'put', 'delete'].includes(method)) {
    throw new Error('Endpoint was not prefixed with a valid HTTP method');
  }

  return { method, pathname };
}
