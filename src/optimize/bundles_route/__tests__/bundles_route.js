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
import expect from '@kbn/expect';
import Hapi from 'hapi';
import Inert from 'inert';
import sinon from 'sinon';

import { createBundlesRoute } from '../bundles_route';
import { PUBLIC_PATH_PLACEHOLDER } from '../../public_path_placeholder';

const chance = new Chance();
const outputFixture = resolve(__dirname, './fixtures/output');

const randomWordsCache = new Set();
const uniqueRandomWord = () => {
  const word = chance.word();

  if (randomWordsCache.has(word)) {
    return uniqueRandomWord();
  }

  randomWordsCache.add(word);
  return word;
};

function replaceAll(source, replace, replaceWith) {
  return source.split(replace).join(replaceWith);
}

describe('optimizer/bundle route', () => {
  const sandbox = sinon.createSandbox();

  function createServer(options = {}) {
    const {
      regularBundlesPath = outputFixture,
      dllBundlesPath = outputFixture,
      basePublicPath = '',
      builtCssPath = outputFixture,
    } = options;

    const server = new Hapi.Server();
    server.register([Inert]);

    server.route(
      createBundlesRoute({
        regularBundlesPath,
        dllBundlesPath,
        basePublicPath,
        builtCssPath,
      })
    );

    return server;
  }

  afterEach(() => sandbox.restore());

  describe('validation', () => {
    it('validates that regularBundlesPath is an absolute path', () => {
      expect(() => {
        createBundlesRoute({
          regularBundlesPath: null,
          dllBundlesPath: '/absolute/path',
          basePublicPath: '',
        });
      }).to.throwError(/absolute path/);
      expect(() => {
        createBundlesRoute({
          regularBundlesPath: './relative',
          dllBundlesPath: '/absolute/path',
          basePublicPath: '',
        });
      }).to.throwError(/absolute path/);
      expect(() => {
        createBundlesRoute({
          regularBundlesPath: 1234,
          dllBundlesPath: '/absolute/path',
          basePublicPath: '',
        });
      }).to.throwError(/absolute path/);
      expect(() => {
        createBundlesRoute({
          regularBundlesPath: '/absolute/path',
          dllBundlesPath: '/absolute/path',
          basePublicPath: '',
        });
      }).to.not.throwError();
    });
    it('validates that basePublicPath is valid', () => {
      expect(() => {
        createBundlesRoute({
          regularBundlesPath: '/bundles',
          dllBundlesPath: '/absolute/path',
          basePublicPath: 123,
        });
      }).to.throwError(/string/);
      expect(() => {
        createBundlesRoute({
          regularBundlesPath: '/bundles',
          dllBundlesPath: '/absolute/path',
          basePublicPath: {},
        });
      }).to.throwError(/string/);
      expect(() => {
        createBundlesRoute({
          regularBundlesPath: '/bundles',
          dllBundlesPath: '/absolute/path',
          basePublicPath: '/a/',
        });
      }).to.throwError(/start and not end with a \//);
      expect(() => {
        createBundlesRoute({
          regularBundlesPath: '/bundles',
          dllBundlesPath: '/absolute/path',
          basePublicPath: 'a/',
        });
      }).to.throwError(/start and not end with a \//);
      expect(() => {
        createBundlesRoute({
          regularBundlesPath: '/bundles',
          dllBundlesPath: '/absolute/path',
          basePublicPath: '/a',
        });
      }).to.not.throwError();
      expect(() => {
        createBundlesRoute({
          regularBundlesPath: '/bundles',
          dllBundlesPath: '/absolute/path',
          basePublicPath: '',
        });
      }).to.not.throwError();
    });
  });

  describe('image', () => {
    it('responds with exact file data', async () => {
      const server = createServer();
      const response = await server.inject({
        url: '/bundles/image.png',
      });

      expect(response.statusCode).to.be(200);
      const image = readFileSync(resolve(outputFixture, 'image.png'));
      expect(response.headers).to.have.property('content-length', image.length);
      expect(response.headers).to.have.property('content-type', 'image/png');
      expect(image).to.eql(response.rawPayload);
    });
  });

  describe('js file without placeholder', () => {
    it('responds with no content-length and exact file data', async () => {
      const server = createServer();
      const response = await server.inject({
        url: '/bundles/no_placeholder.js',
      });

      expect(response.statusCode).to.be(200);
      expect(response.headers).to.not.have.property('content-length');
      expect(response.headers).to.have.property(
        'content-type',
        'application/javascript; charset=utf-8'
      );
      expect(readFileSync(resolve(outputFixture, 'no_placeholder.js'))).to.eql(response.rawPayload);
    });
  });

  describe('js file with placeholder', () => {
    it('responds with no content-length and modified file data', async () => {
      const basePublicPath = `/${uniqueRandomWord()}`;
      const server = createServer({ basePublicPath });

      const response = await server.inject({
        url: '/bundles/with_placeholder.js',
      });

      expect(response.statusCode).to.be(200);
      const source = readFileSync(resolve(outputFixture, 'with_placeholder.js'), 'utf8');
      expect(response.headers).to.not.have.property('content-length');
      expect(response.headers).to.have.property(
        'content-type',
        'application/javascript; charset=utf-8'
      );
      expect(response.result.indexOf(source)).to.be(-1);
      expect(response.result).to.be(
        replaceAll(source, PUBLIC_PATH_PLACEHOLDER, `${basePublicPath}/bundles/`)
      );
    });
  });

  describe('css file without placeholder', () => {
    it('responds with no content-length and exact file data', async () => {
      const server = createServer();
      const response = await server.inject({
        url: '/bundles/no_placeholder.css',
      });

      expect(response.statusCode).to.be(200);
      expect(response.headers).to.not.have.property('content-length');
      expect(response.headers).to.have.property('content-type', 'text/css; charset=utf-8');
      expect(readFileSync(resolve(outputFixture, 'no_placeholder.css'))).to.eql(
        response.rawPayload
      );
    });
  });

  describe('css file with placeholder', () => {
    it('responds with no content-length and modified file data', async () => {
      const basePublicPath = `/${uniqueRandomWord()}`;
      const server = createServer({ basePublicPath });

      const response = await server.inject({
        url: '/bundles/with_placeholder.css',
      });

      expect(response.statusCode).to.be(200);
      const source = readFileSync(resolve(outputFixture, 'with_placeholder.css'), 'utf8');
      expect(response.headers).to.not.have.property('content-length');
      expect(response.headers).to.have.property('content-type', 'text/css; charset=utf-8');
      expect(response.result.indexOf(source)).to.be(-1);
      expect(response.result).to.be(
        replaceAll(source, PUBLIC_PATH_PLACEHOLDER, `${basePublicPath}/bundles/`)
      );
    });
  });

  describe('js file outside regularBundlesPath', () => {
    it('responds with a 404', async () => {
      const server = createServer();

      const response = await server.inject({
        url: '/bundles/../outside_output.js',
      });

      expect(response.statusCode).to.be(404);
      expect(response.result).to.eql({
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
        url: '/bundles/non_existent.js',
      });

      expect(response.statusCode).to.be(404);
      expect(response.result).to.eql({
        error: 'Not Found',
        message: 'Not Found',
        statusCode: 404,
      });
    });
  });

  describe('missing regularBundlesPath', () => {
    it('responds with 404', async () => {
      const server = createServer({
        regularBundlesPath: resolve(__dirname, 'fixtures/not_really_output'),
      });

      const response = await server.inject({
        url: '/bundles/with_placeholder.js',
      });

      expect(response.statusCode).to.be(404);
      expect(response.result).to.eql({
        error: 'Not Found',
        message: 'Not Found',
        statusCode: 404,
      });
    });
  });

  describe('etag', () => {
    it('only calculates hash of file on first request', async () => {
      const createHash = sandbox.spy(crypto, 'createHash');

      const server = createServer();

      sinon.assert.notCalled(createHash);
      const resp1 = await server.inject({
        url: '/bundles/no_placeholder.js',
      });

      sinon.assert.calledOnce(createHash);
      createHash.resetHistory();
      expect(resp1.statusCode).to.be(200);

      const resp2 = await server.inject({
        url: '/bundles/no_placeholder.js',
      });

      sinon.assert.notCalled(createHash);
      expect(resp2.statusCode).to.be(200);
    });

    it('is unique per basePublicPath although content is the same', async () => {
      const basePublicPath1 = `/${uniqueRandomWord()}`;
      const basePublicPath2 = `/${uniqueRandomWord()}`;

      const [resp1, resp2] = await Promise.all([
        createServer({ basePublicPath: basePublicPath1 }).inject({
          url: '/bundles/no_placeholder.js',
        }),
        createServer({ basePublicPath: basePublicPath2 }).inject({
          url: '/bundles/no_placeholder.js',
        }),
      ]);

      expect(resp1.statusCode).to.be(200);
      expect(resp2.statusCode).to.be(200);

      expect(resp1.rawPayload).to.eql(resp2.rawPayload);

      expect(resp1.headers.etag).to.be.a('string');
      expect(resp2.headers.etag).to.be.a('string');
      expect(resp1.headers.etag).to.not.eql(resp2.headers.etag);
    });
  });

  describe('cache control', () => {
    it('responds with 304 when etag and last modified are sent back', async () => {
      const server = createServer();
      const resp = await server.inject({
        url: '/bundles/with_placeholder.js',
      });

      expect(resp.statusCode).to.be(200);

      const resp2 = await server.inject({
        url: '/bundles/with_placeholder.js',
        headers: {
          'if-modified-since': resp.headers['last-modified'],
          'if-none-match': resp.headers.etag,
        },
      });

      expect(resp2.statusCode).to.be(304);
      expect(resp2.result).to.have.length(0);
    });
  });
});
