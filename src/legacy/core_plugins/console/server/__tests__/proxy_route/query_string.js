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

import sinon from 'sinon';
import Wreck from '@hapi/wreck';
import expect from '@kbn/expect';
import { Server } from 'hapi';

import { createProxyRoute } from '../../';

import { createWreckResponseStub } from './stubs';

describe('Console Proxy Route', () => {
  const sandbox = sinon.createSandbox();
  const teardowns = [];
  let request;

  beforeEach(() => {
    sandbox.stub(Wreck, 'request').callsFake(createWreckResponseStub());

    request = async (method, path) => {
      const server = new Server();
      server.route(
        createProxyRoute({
          baseUrl: 'http://localhost:9200',
        })
      );

      teardowns.push(() => server.stop());

      const params = [];
      if (path != null) params.push(`path=${path}`);
      if (method != null) params.push(`method=${method}`);
      return await server.inject({
        method: 'POST',
        url: `/api/console/proxy${params.length ? `?${params.join('&')}` : ''}`,
      });
    };
  });

  afterEach(async () => {
    sandbox.restore();
    await Promise.all(teardowns.splice(0).map(fn => fn()));
  });

  describe('query string', () => {
    describe('path', () => {
      describe('contains full url', () => {
        it('treats the url as a path', async () => {
          await request('GET', 'http://evil.com/test');
          sinon.assert.calledOnce(Wreck.request);
          const args = Wreck.request.getCall(0).args;
          expect(args[1]).to.be('http://localhost:9200/http://evil.com/test?pretty');
        });
      });
      describe('is missing', () => {
        it('returns a 400 error', async () => {
          const { statusCode } = await request('GET', undefined);
          expect(statusCode).to.be(400);
          sinon.assert.notCalled(Wreck.request);
        });
      });
      describe('is empty', () => {
        it('returns a 400 error', async () => {
          const { statusCode } = await request('GET', '');
          expect(statusCode).to.be(400);
          sinon.assert.notCalled(Wreck.request);
        });
      });
      describe('starts with a slash', () => {
        it('combines well with the base url', async () => {
          await request('GET', '/index/type/id');
          sinon.assert.calledOnce(Wreck.request);
          expect(Wreck.request.getCall(0).args[1]).to.be(
            'http://localhost:9200/index/type/id?pretty'
          );
        });
      });
      describe(`doesn't start with a slash`, () => {
        it('combines well with the base url', async () => {
          await request('GET', 'index/type/id');
          sinon.assert.calledOnce(Wreck.request);
          expect(Wreck.request.getCall(0).args[1]).to.be(
            'http://localhost:9200/index/type/id?pretty'
          );
        });
      });
    });
    describe('method', () => {
      describe('is missing', () => {
        it('returns a 400 error', async () => {
          const { statusCode } = await request(null, '/');
          expect(statusCode).to.be(400);
          sinon.assert.notCalled(Wreck.request);
        });
      });
      describe('is empty', () => {
        it('returns a 400 error', async () => {
          const { statusCode } = await request('', '/');
          expect(statusCode).to.be(400);
          sinon.assert.notCalled(Wreck.request);
        });
      });
      describe('is an invalid http method', () => {
        it('returns a 400 error', async () => {
          const { statusCode } = await request('foo', '/');
          expect(statusCode).to.be(400);
          sinon.assert.notCalled(Wreck.request);
        });
      });
      describe('is mixed case', () => {
        it('sends a request with the exact method', async () => {
          const { statusCode } = await request('HeAd', '/');
          expect(statusCode).to.be(200);
          sinon.assert.calledOnce(Wreck.request);
          expect(Wreck.request.getCall(0).args[0]).to.be('HeAd');
        });
      });
    });
  });
});
