/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import http from 'http';
import type { AddressInfo } from 'net';
import axios from 'axios';
import type { ActionContext } from '../../connector_spec';
import { UrlscanIo } from './urlscan_io';

const API_KEY = '00000000-0000-4000-8000-000000000000';

const listen = async (host: string, handler: http.RequestListener): Promise<http.Server> => {
  const server = http.createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, host, resolve));
  return server;
};

const close = (server: http.Server) =>
  new Promise<void>((resolve) => server.close(() => resolve()));

const portOf = (server: http.Server): number => (server.address() as AddressInfo).port;

// Real Axios against two local servers, so the headers are the ones that arrive.
describe('URLScan.io connector redirects', () => {
  let origin: http.Server;
  let target: http.Server;
  let received: Array<{ host: 'origin' | 'target'; apiKey: string | string[] | undefined }>;

  beforeEach(async () => {
    received = [];
    target = await listen('localhost', (req, res) => {
      received.push({ host: 'target', apiKey: req.headers['api-key'] });
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ results: [] }));
    });
    origin = await listen('127.0.0.1', (req, res) => {
      received.push({ host: 'origin', apiKey: req.headers['api-key'] });
      // 307 keeps the method, and `localhost` is another host than `127.0.0.1`.
      res.writeHead(307, { location: `http://localhost:${portOf(target)}/` });
      res.end();
    });
  });

  afterEach(async () => {
    await Promise.all([close(origin), close(target)]);
  });

  // The client the connector gets: the key as a default header, requests sent to the local origin.
  const createClient = () => {
    // The Node adapter the actions plugin uses; Jest's browser environment would pick XHR.
    const client = axios.create({ adapter: 'http', proxy: false });
    client.interceptors.request.use((config) => ({
      ...config,
      url: config.url?.replace('https://urlscan.io', `http://127.0.0.1:${portOf(origin)}`),
    }));
    // Where the api_key_header auth type puts it.
    client.defaults.headers.common['api-key'] = API_KEY;
    return client;
  };

  it('would forward the key without the connector naming the header', async () => {
    const client = createClient();

    await client.get('https://urlscan.io/api/v1/search/');

    expect(received).toEqual([
      { host: 'origin', apiKey: API_KEY },
      { host: 'target', apiKey: API_KEY },
    ]);
  });

  it.each([
    ['searchScans', { q: 'x' }],
    ['scanUrl', { url: 'https://phish.example/login' }],
  ])('%s follows a cross-host redirect without the api-key header', async (name, input) => {
    const ctx = {
      client: createClient(),
      config: {},
      secrets: { authType: 'api_key_header' },
      log: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    } as unknown as ActionContext;

    await UrlscanIo.actions[name].handler(ctx, input);

    expect(received).toEqual([
      { host: 'origin', apiKey: API_KEY },
      { host: 'target', apiKey: undefined },
    ]);
  });
});
