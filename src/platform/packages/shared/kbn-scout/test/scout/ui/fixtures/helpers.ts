/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import http from 'http';

/** Starts a local HTTP server that answers every request with `body`. */
export const serve = (body: string): Promise<http.Server> =>
  new Promise((resolve, reject) => {
    const server = http.createServer((_request, response) => response.end(body));
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });

/** Returns the port a local server listens on. */
export const getPort = (server: http.Server): number => {
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('Server is not listening on a TCP port');
  }
  return address.port;
};

/** Sets environment variables and returns a function that restores the previous values. */
export const setEnv = (vars: Record<string, string>): (() => void) => {
  const previous = Object.keys(vars).map((name) => [name, process.env[name]] as const);
  Object.assign(process.env, vars);

  return () => {
    for (const [name, value] of previous) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  };
};
