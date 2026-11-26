/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type net from 'net';

export interface LocalServer {
  port: number;
  close: () => void;
}

/** Starts `server` on a free local port. */
export const listen = (server: net.Server): Promise<LocalServer> =>
  new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (address === null || typeof address === 'string') {
        reject(new Error('Server is not listening on a TCP port'));
        return;
      }
      resolve({ port: address.port, close: () => server.close() });
    });
  });

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
