/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import http from 'http';
import https from 'https';

import type { HttpServiceSetup } from '@kbn/core/server';

const REQUEST_TIMEOUT_MS = 15_000;

export interface LoopbackHttpResult {
  url: string;
  status: number;
  body: unknown;
}

/**
 * Issues a GET against this Kibana, using the caller-supplied headers (typically the
 * workload's loopback auth headers). Tokens never leave this process.
 */
export const loopbackGet = async ({
  httpSetup,
  path,
  headers,
}: {
  httpSetup: HttpServiceSetup;
  path: string;
  headers: Record<string, string>;
}): Promise<LoopbackHttpResult> => {
  const { protocol, hostname, port } = httpSetup.getServerInfo();
  const loopbackHost =
    hostname === '0.0.0.0' || hostname === '::' || hostname === '[::]' ? '127.0.0.1' : hostname;
  const url = `${protocol}://${loopbackHost}:${port}${httpSetup.basePath.serverBasePath}${path}`;

  const { status, body } = await new Promise<{ status: number; body: string }>(
    (resolve, reject) => {
      const onResponse = (res: http.IncomingMessage) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk as Buffer));
        res.on('end', () => {
          resolve({
            status: res.statusCode ?? 0,
            body: Buffer.concat(chunks).toString('utf8'),
          });
        });
      };

      const req =
        protocol === 'https'
          ? https.request(
              url,
              {
                method: 'GET',
                headers,
                timeout: REQUEST_TIMEOUT_MS,
                rejectUnauthorized: false,
              },
              onResponse
            )
          : http.request(url, { method: 'GET', headers, timeout: REQUEST_TIMEOUT_MS }, onResponse);

      req.on('timeout', () => {
        req.destroy(
          new Error(`Loopback request to ${path} timed out after ${REQUEST_TIMEOUT_MS}ms`)
        );
      });
      req.on('error', reject);
      req.end();
    }
  );

  let parsed: unknown = body;
  try {
    parsed = JSON.parse(body);
  } catch {
    // Leave as a string when the response is not JSON.
  }

  return { url, status, body: parsed };
};
