/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { resolve } from 'path';
import { readFileSync } from 'fs';
import crypto from 'crypto';

import Chance from 'chance';
import Hapi from '@hapi/hapi';
import Inert from '@hapi/inert';

import { createBundlesRoute } from './bundles_route';

const chance = new Chance();
const fooPluginFixture = resolve(__dirname, './__fixtures__/plugin/foo');
const createHashMock = jest.spyOn(crypto, 'createHash');

const randomWordsCache = new Set();
const uniqueRandomWord = (): string => {
  const word = chance.word();

  if (randomWordsCache.has(word)) {
    return uniqueRandomWord();
  }

  randomWordsCache.add(word);
  return word;
};

function createServer({
  basePublicPath = '',
  isDist = false,
}: {
  basePublicPath?: string;
  isDist?: boolean;
} = {}) {
  const buildHash = '1234';
  const npUiPluginPublicDirs = [
    {
      id: 'foo',
      path: fooPluginFixture,
    },
  ];

  const server = new Hapi.Server();
  server.register([Inert]);

  server.route(
    createBundlesRoute({
      basePublicPath,
      npUiPluginPublicDirs,
      buildHash,
      isDist,
    })
  );

  return server;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('validation', () => {
  it('validates that basePublicPath is valid', () => {
    expect(() => {
      createServer({
        // @ts-expect-error intentionally trying to break things
        basePublicPath: 123,
      });
    }).toThrowErrorMatchingInlineSnapshot(`"basePublicPath must be a string"`);
    expect(() => {
      createServer({
        // @ts-expect-error intentionally trying to break things
        basePublicPath: {},
      });
    }).toThrowErrorMatchingInlineSnapshot(`"basePublicPath must be a string"`);
    expect(() => {
      createServer({
        basePublicPath: '/a/',
      });
    }).toThrowErrorMatchingInlineSnapshot(
      `"basePublicPath must be empty OR start and not end with a /"`
    );
    expect(() => {
      createServer({
        basePublicPath: 'a/',
      });
    }).toThrowErrorMatchingInlineSnapshot(
      `"basePublicPath must be empty OR start and not end with a /"`
    );
    expect(() => {
      createServer({
        basePublicPath: '/a',
      });
    }).not.toThrowError();
    expect(() => {
      createServer({
        basePublicPath: '',
      });
    }).not.toThrowError();
  });
});

describe('image', () => {
  it('responds with exact file data', async () => {
    const server = createServer();
    const response = await server.inject({
      url: '/1234/bundles/plugin/foo/image.png',
    });

    expect(response.statusCode).toBe(200);
    const image = readFileSync(resolve(fooPluginFixture, 'image.png'));
    expect(response.headers).toHaveProperty('content-length', image.length);
    expect(response.headers).toHaveProperty('content-type', 'image/png');
    expect(image).toEqual(response.rawPayload);
  });
});

describe('js file', () => {
  it('responds with no content-length and exact file data', async () => {
    const server = createServer();
    const response = await server.inject({
      url: '/1234/bundles/plugin/foo/plugin.js',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers).not.toHaveProperty('content-length');
    expect(response.headers).toHaveProperty(
      'content-type',
      'application/javascript; charset=utf-8'
    );
    expect(readFileSync(resolve(fooPluginFixture, 'plugin.js'))).toEqual(response.rawPayload);
  });
});

describe('js file outside plugin', () => {
  it('responds with a 404', async () => {
    const server = createServer();

    const response = await server.inject({
      url: '/1234/bundles/plugin/foo/../outside_output.js',
    });

    expect(response.statusCode).toBe(404);
    expect(response.result).toEqual({
      error: 'Not Found',
      message: 'Not Found',
      statusCode: 404,
    });
  });
});

describe('missing js file', () => {
  it('responds with 404', async () => {
    const server = createServer();

    const response = await server.inject({
      url: '/1234/bundles/plugin/foo/non_existent.js',
    });

    expect(response.statusCode).toBe(404);
    expect(response.result).toEqual({
      error: 'Not Found',
      message: 'Not Found',
      statusCode: 404,
    });
  });
});

describe('etag', () => {
  it('only calculates hash of file on first request', async () => {
    const server = createServer();

    expect(createHashMock).not.toHaveBeenCalled();
    const resp1 = await server.inject({
      url: '/1234/bundles/plugin/foo/plugin.js',
    });

    expect(createHashMock).toHaveBeenCalledTimes(1);
    createHashMock.mockClear();
    expect(resp1.statusCode).toBe(200);

    const resp2 = await server.inject({
      url: '/1234/bundles/plugin/foo/plugin.js',
    });

    expect(createHashMock).not.toHaveBeenCalled();
    expect(resp2.statusCode).toBe(200);
  });

  it('is unique per basePublicPath although content is the same (by default)', async () => {
    const basePublicPath1 = `/${uniqueRandomWord()}`;
    const basePublicPath2 = `/${uniqueRandomWord()}`;

    const [resp1, resp2] = await Promise.all([
      createServer({ basePublicPath: basePublicPath1 }).inject({
        url: '/1234/bundles/plugin/foo/plugin.js',
      }),
      createServer({ basePublicPath: basePublicPath2 }).inject({
        url: '/1234/bundles/plugin/foo/plugin.js',
      }),
    ]);

    expect(resp1.statusCode).toBe(200);
    expect(resp2.statusCode).toBe(200);

    expect(resp1.rawPayload).toEqual(resp2.rawPayload);

    expect(resp1.headers.etag).toEqual(expect.any(String));
    expect(resp2.headers.etag).toEqual(expect.any(String));
    expect(resp1.headers.etag).not.toEqual(resp2.headers.etag);
  });
});

describe('cache control', () => {
  it('responds with 304 when etag and last modified are sent back', async () => {
    const server = createServer();
    const resp = await server.inject({
      url: '/1234/bundles/plugin/foo/plugin.js',
    });

    expect(resp.statusCode).toBe(200);

    const resp2 = await server.inject({
      url: '/1234/bundles/plugin/foo/plugin.js',
      headers: {
        'if-modified-since': resp.headers['last-modified'],
        'if-none-match': resp.headers.etag,
      },
    });

    expect(resp2.statusCode).toBe(304);
    expect(resp2.result).toHaveLength(0);
  });
});

describe('caching', () => {
  describe('for non-distributable mode', () => {
    it('uses "etag" header to invalidate cache', async () => {
      const basePublicPath = `/${uniqueRandomWord()}`;

      const responce = await createServer({ basePublicPath }).inject({
        url: '/1234/bundles/plugin/foo/plugin.js',
      });

      expect(responce.statusCode).toBe(200);

      expect(responce.headers.etag).toEqual(expect.any(String));
      expect(responce.headers['cache-control']).toBe('must-revalidate');
    });

    it('creates the same "etag" header for the same content with the same basePath', async () => {
      const [resp1, resp2] = await Promise.all([
        createServer({ basePublicPath: '' }).inject({
          url: '/1234/bundles/plugin/foo/plugin.js',
        }),
        createServer({ basePublicPath: '' }).inject({
          url: '/1234/bundles/plugin/foo/plugin.js',
        }),
      ]);

      expect(resp1.statusCode).toBe(200);
      expect(resp2.statusCode).toBe(200);

      expect(resp1.rawPayload).toEqual(resp2.rawPayload);

      expect(resp1.headers.etag).toEqual(expect.any(String));
      expect(resp2.headers.etag).toEqual(expect.any(String));
      expect(resp1.headers.etag).toEqual(resp2.headers.etag);
    });
  });

  describe('for distributable mode', () => {
    it('commands to cache assets for each release for a year', async () => {
      const basePublicPath = `/${uniqueRandomWord()}`;

      const responce = await createServer({
        basePublicPath,
        isDist: true,
      }).inject({
        url: '/1234/bundles/plugin/foo/plugin.js',
      });

      expect(responce.statusCode).toBe(200);

      expect(responce.headers.etag).toBe(undefined);
      expect(responce.headers['cache-control']).toBe('max-age=31536000');
    });
  });
});
