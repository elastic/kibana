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

import { Agent } from 'http';

import sinon from 'sinon';
import * as requestModule from '../../request';
import expect from '@kbn/expect';
import { Server } from 'hapi';

import { createProxyRoute } from '../../';

import { createResponseStub } from './stubs';

describe('Console Proxy Route', () => {
  const sandbox = sinon.createSandbox();
  const teardowns = [];
  let setup;

  beforeEach(() => {
    sandbox.stub(requestModule, 'sendRequest').callsFake(createResponseStub());

    setup = () => {
      const server = new Server();
      teardowns.push(() => server.stop());
      return { server };
    };
  });

  afterEach(async () => {
    sandbox.restore();
    await Promise.all(teardowns.splice(0).map(fn => fn()));
  });

  describe('params', () => {
    describe('pathFilters', () => {
      describe('no matches', () => {
        it('rejects with 403', async () => {
          const { server } = setup();
          server.route(
            createProxyRoute({
              pathFilters: [/^\/foo\//, /^\/bar\//],
            })
          );

          const { statusCode } = await server.inject({
            method: 'POST',
            url: '/api/console/proxy?method=GET&path=/baz/id',
          });

          expect(statusCode).to.be(403);
        });
      });
      describe('one match', () => {
        it('allows the request', async () => {
          const { server } = setup();
          server.route(
            createProxyRoute({
              hosts: ['http://localhost:9200'],
              pathFilters: [/^\/foo\//, /^\/bar\//],
            })
          );

          const { statusCode } = await server.inject({
            method: 'POST',
            url: '/api/console/proxy?method=GET&path=/foo/id',
          });

          expect(statusCode).to.be(200);
          sinon.assert.calledOnce(requestModule.sendRequest);
        });
      });
      describe('all match', () => {
        it('allows the request', async () => {
          const { server } = setup();
          server.route(
            createProxyRoute({
              hosts: ['http://localhost:9200'],
              pathFilters: [/^\/foo\//, /^\/bar\//],
            })
          );

          const { statusCode } = await server.inject({
            method: 'POST',
            url: '/api/console/proxy?method=GET&path=/foo/id',
          });

          expect(statusCode).to.be(200);
          sinon.assert.calledOnce(requestModule.sendRequest);
        });
      });
    });

    describe('getConfigForReq()', () => {
      it('passes the request and targeted uri', async () => {
        const { server } = setup();

        const getConfigForReq = sinon.stub().returns({});

        server.route(createProxyRoute({ hosts: ['http://localhost:9200'], getConfigForReq }));
        await server.inject({
          method: 'POST',
          url: '/api/console/proxy?method=HEAD&path=/index/id',
        });

        sinon.assert.calledOnce(getConfigForReq);
        const args = getConfigForReq.getCall(0).args;
        expect(args[0]).to.have.property('path', '/api/console/proxy');
        expect(args[0]).to.have.property('method', 'post');
        expect(args[0])
          .to.have.property('query')
          .eql({ method: 'HEAD', path: '/index/id' });
        expect(args[1]).to.be('http://localhost:9200/index/id?pretty=true');
      });

      it('sends the returned timeout, agent, and base headers to request', async () => {
        const { server } = setup();

        const timeout = Math.round(Math.random() * 10000);
        const agent = new Agent();
        const rejectUnauthorized = !!Math.round(Math.random());
        const headers = {
          foo: 'bar',
          baz: 'bop',
        };

        server.route(
          createProxyRoute({
            hosts: ['http://localhost:9200'],
            getConfigForReq: () => ({
              timeout,
              agent,
              headers,
              rejectUnauthorized,
            }),
          })
        );

        await server.inject({
          method: 'POST',
          url: '/api/console/proxy?method=HEAD&path=/index/id',
        });

        sinon.assert.calledOnce(requestModule.sendRequest);
        const opts = requestModule.sendRequest.getCall(0).args[0];
        expect(opts).to.have.property('timeout', timeout);
        expect(opts).to.have.property('agent', agent);
        expect(opts).to.have.property('rejectUnauthorized', rejectUnauthorized);
        expect(opts.headers).to.have.property('foo', 'bar');
        expect(opts.headers).to.have.property('baz', 'bop');
      });
    });
  });
});
