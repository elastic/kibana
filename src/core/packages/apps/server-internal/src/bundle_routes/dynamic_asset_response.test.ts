/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { kibanaResponseFactory } from '@kbn/core-http-router-server-internal';
import { createDynamicAssetHandler } from './dynamic_asset_response';

let bundlesPath: string;

function getHandler(args?: Partial<Parameters<typeof createDynamicAssetHandler>[0]>) {
  return createDynamicAssetHandler({
    bundlesPath,
    publicPath: '/public',
    fileHashCache: {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    },
    isDist: true,
    ...args,
  });
}

beforeEach(() => {
  bundlesPath = mkdtempSync(join(tmpdir(), 'dynamic-asset-response-'));
});

afterEach(() => {
  rmSync(bundlesPath, { recursive: true, force: true });
});
it('returns 403 if the path requested does not match bundle path', async () => {
  const handler = getHandler();
  const result = await handler(
    {} as any,
    { params: { path: '/non-existent/abc.js' }, headers: { 'accept-encoding': '*' } } as any,
    kibanaResponseFactory
  );
  expect(result.status).toBe(403);
});

it('returns 404 if the file does not exist', async () => {
  const handler = getHandler();
  const filePath = join(bundlesPath, 'abc.js');
  const result = await handler(
    {} as any,
    { params: { path: filePath }, headers: { 'accept-encoding': '*' } } as any,
    kibanaResponseFactory
  );
  expect(result.status).toBe(404);
});

describe('headers', () => {
  it('returns the expected headers', async () => {
    const handler = getHandler();
    const filePath = join(bundlesPath, 'abc.js');
    writeFileSync(filePath, 'test');
    const result = await handler(
      {} as any,
      { params: { path: filePath }, headers: { 'accept-encoding': 'br' } } as any,
      kibanaResponseFactory
    );
    expect(result.options.headers).toEqual({
      'cache-control': 'public, max-age=31536000, immutable',
      'content-type': 'application/javascript; charset=utf-8',
    });
    result.payload.destroy();
  });

  it('returns the expected headers when not in dist mode', async () => {
    const handler = getHandler({ isDist: false });
    const filePath = join(bundlesPath, 'abc.js');
    writeFileSync(filePath, 'test');
    const result = await handler(
      {} as any,
      { params: { path: filePath }, headers: { 'accept-encoding': '*' } } as any,
      kibanaResponseFactory
    );
    expect(result.options.headers).toEqual({
      'cache-control': 'must-revalidate',
      'content-type': 'application/javascript; charset=utf-8',
      etag: expect.stringMatching(/^[a-f0-9]{64}-\/public/i),
    });
    result.payload.destroy();
  });
});
