/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import http from 'node:http';
import { kibanaSupertest } from './kibana_supertest';

describe('wrapKibanaSupertestAgent', () => {
  it('preserves .query() params when the request runs', async () => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1');
      if (url.searchParams.get('apiVersion') !== '1') {
        res.writeHead(400);
        res.end('missing apiVersion');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const { port } = server.address() as { port: number };

    try {
      const client = kibanaSupertest(`http://127.0.0.1:${port}`);
      const { body } = await client
        .get('/api/example')
        .query({ apiVersion: '1', elasticInternalOrigin: 'true' })
        .expect(200);

      expect(body).toEqual({ ok: true });
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve()))
      );
    }
  });

  it('preserves Connection header when the request runs', async () => {
    let requestConnection: string | undefined;
    const server = http.createServer((req, res) => {
      requestConnection = req.headers.connection;
      res.writeHead(200, { 'Content-Type': 'application/json', Connection: 'keep-alive' });
      res.end(JSON.stringify({ ok: true }));
    });

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const { port } = server.address() as { port: number };

    try {
      const client = kibanaSupertest(`http://127.0.0.1:${port}`);
      const { header } = await client.get('/').set('Connection', 'keep-alive').expect(200);

      expect(requestConnection).toBe('keep-alive');
      expect(header.connection).toBe('keep-alive');
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve()))
      );
    }
  });
});
