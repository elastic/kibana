/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import mockFs from 'mock-fs';
import { kibanaResponseFactory } from '@kbn/core-http-router-server-internal';
import { createDynamicAssetHandler } from './dynamic_asset_response';

function getHandler(args?: Partial<Parameters<typeof createDynamicAssetHandler>[0]>) {
  return createDynamicAssetHandler({
    bundlesPath: '/test',
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

afterEach(() => {
  mockFs.restore();
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
  mockFs({}); // no files
  const filePath = '/test/abc.js';
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
    const filePath = '/test/abc.js';
    mockFs({
      [filePath]: Buffer.from('test'),
    });
    const result = await handler(
      {} as any,
      { params: { path: filePath }, headers: { 'accept-encoding': 'br' } } as any,
      kibanaResponseFactory
    );
    expect(result.options.headers).toEqual({
      'cache-control': 'public, max-age=31536000, immutable',
      'content-type': 'application/javascript; charset=utf-8',
    });
  });

  it('returns the expected headers when not in dist mode', async () => {
    const handler = getHandler({ isDist: false });
    const filePath = '/test/abc.js';
    mockFs({
      [filePath]: Buffer.from('test'),
    });
    const result = await handler(
      {} as any,
      { params: { path: filePath }, headers: { 'accept-encoding': '*' } } as any,
      kibanaResponseFactory
    );
    expect(result.options.headers).toEqual({
      'cache-control': 'must-revalidate',
      'content-type': 'application/javascript; charset=utf-8',
      etag: expect.stringMatching(/^[a-f0-9]{40}-\/public/i),
    });
  });
});
