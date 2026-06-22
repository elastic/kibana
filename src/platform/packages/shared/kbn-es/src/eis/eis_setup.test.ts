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
import type { AddressInfo } from 'net';
import { ToolingLog } from '@kbn/tooling-log';

import { setCcmApiKey, type EisElasticsearchConnection } from './eis_setup';

interface MockResponse {
  statusCode: number;
  body?: string;
}

describe('setCcmApiKey', () => {
  let server: http.Server;
  let baseUrl: string;
  let queued: MockResponse[];
  let requestCount: number;
  const log = new ToolingLog();

  const connection = (): EisElasticsearchConnection => ({
    baseUrl,
    credentials: { username: 'elastic', password: 'changeme' },
    ssl: false,
  });

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      requestCount += 1;
      const next = queued.shift() ?? { statusCode: 200 };
      // Close the socket after each response so no keep-alive handles linger
      // and leave Jest waiting on open sockets after the suite finishes.
      res.writeHead(next.statusCode, { 'Content-Type': 'application/json', Connection: 'close' });
      res.end(next.body ?? '');
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    // eisHttpRequest uses the global agents; destroy any pooled sockets so Jest
    // doesn't report lingering open handles after the suite finishes.
    http.globalAgent.destroy();
    https.globalAgent.destroy();
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  });

  beforeEach(() => {
    queued = [];
    requestCount = 0;
  });

  it('resolves without error on a 2xx response', async () => {
    queued = [{ statusCode: 200 }];
    await expect(setCcmApiKey('essu_test', connection(), log)).resolves.toBeUndefined();
    expect(requestCount).toBe(1);
  });

  it('surfaces the EIS validation reason and a refresh hint on 401, without retrying', async () => {
    queued = [
      {
        statusCode: 401,
        body: JSON.stringify({
          error: { reason: 'Failed to validate the Cloud Connected Mode API key' },
        }),
      },
    ];

    const error = await setCcmApiKey('essu_stale', connection(), log).catch((e: Error) => e);

    expect(error).toBeInstanceOf(Error);
    const cause = (error as Error & { cause?: Error }).cause;
    expect(cause?.message).toContain('HTTP 401 — Elasticsearch rejected the CCM API key.');
    expect(cause?.message).toContain('Failed to validate the Cloud Connected Mode API key');
    expect(cause?.message).toContain('rm ~/.elastic/eis-ccm-key.json');
    // 401 must fail fast — exactly one request, no retries.
    expect(requestCount).toBe(1);
  });

  it('handles a string-shaped ES error body on 403', async () => {
    queued = [{ statusCode: 403, body: JSON.stringify({ error: 'forbidden' }) }];

    const error = await setCcmApiKey('essu_x', connection(), log).catch((e: Error) => e);
    const cause = (error as Error & { cause?: Error }).cause;

    expect(cause?.message).toContain('HTTP 403 — Elasticsearch rejected the CCM API key.');
    expect(cause?.message).toContain('Elasticsearch said: forbidden');
    expect(requestCount).toBe(1);
  });

  it('retries on a non-auth error and includes the ES reason in the final message', async () => {
    queued = [
      { statusCode: 500, body: JSON.stringify({ error: { reason: 'boom' } }) },
      { statusCode: 500, body: JSON.stringify({ error: { reason: 'boom' } }) },
      { statusCode: 500, body: JSON.stringify({ error: { reason: 'boom' } }) },
    ];

    const error = await setCcmApiKey('essu_x', connection(), log).catch((e: Error) => e);
    const cause = (error as Error & { cause?: Error }).cause;

    expect(cause?.message).toBe('HTTP 500 — boom');
    expect(requestCount).toBe(3);
  }, 15_000);
});
