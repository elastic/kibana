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

import { request } from 'http';

import sinon from 'sinon';
import expect from '@kbn/expect';
import { Server } from 'hapi';
import * as requestModule from '../../request';

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
      server.route(
        createProxyRoute({
          baseUrl: 'http://localhost:9200',
        })
      );

      teardowns.push(() => server.stop());

      return { server };
    };
  });

  afterEach(async () => {
    sandbox.restore();
    await Promise.all(teardowns.splice(0).map(fn => fn()));
  });

  describe('headers', function() {
    this.timeout(Infinity);

    it('forwards the remote header info', async () => {
      const { server } = setup();
      await server.start();

      const resp = await new Promise(resolve => {
        request(
          {
            protocol: server.info.protocol + ':',
            host: server.info.address,
            port: server.info.port,
            method: 'POST',
            path: '/api/console/proxy?method=GET&path=/',
          },
          resolve
        ).end();
      });

      resp.destroy();

      sinon.assert.calledOnce(requestModule.sendRequest);
      const { headers } = requestModule.sendRequest.getCall(0).args[0];
      expect(headers)
        .to.have.property('x-forwarded-for')
        .and.not.be('');
      expect(headers)
        .to.have.property('x-forwarded-port')
        .and.not.be('');
      expect(headers)
        .to.have.property('x-forwarded-proto')
        .and.not.be('');
      expect(headers)
        .to.have.property('x-forwarded-host')
        .and.not.be('');
    });
  });
});
