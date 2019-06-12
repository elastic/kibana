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

import expect from '@kbn/expect';
import { createHandlers } from '../create_handlers';

const mockRequest = {
  headers: 'i can haz headers',
};

const mockServer = {
  plugins: {
    elasticsearch: {
      getCluster: () => ({
        callWithRequest: (...args) => Promise.resolve(args),
      }),
    },
  },
  config: () => ({
    has: () => false,
    get: val => val,
  }),
  info: {
    uri: 'serveruri',
  },
};

describe('server createHandlers', () => {
  it('provides helper methods and properties', () => {
    const handlers = createHandlers(mockRequest, mockServer);

    expect(handlers).to.have.property('environment', 'server');
    expect(handlers).to.have.property('serverUri');
    expect(handlers).to.have.property('elasticsearchClient');
  });

  describe('elasticsearchClient', () => {
    it('executes callWithRequest', async () => {
      const handlers = createHandlers(mockRequest, mockServer);
      const [request, endpoint, payload] = await handlers.elasticsearchClient(
        'endpoint',
        'payload'
      );
      expect(request).to.equal(mockRequest);
      expect(endpoint).to.equal('endpoint');
      expect(payload).to.equal('payload');
    });
  });
});
