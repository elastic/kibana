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
import { createUpdateRoute } from './update';
import { MockServer } from './_mock_server';

describe('PUT /api/saved_objects/{type}/{id?}', () => {
  const savedObjectsClient = { update: sinon.stub() };
  let server;

  beforeEach(() => {
    server = new MockServer();

    const prereqs = {
      getSavedObjectsClient: {
        assign: 'savedObjectsClient',
        method(request, reply) {
          reply(savedObjectsClient);
        }
      },
    };

    server.route(createUpdateRoute(prereqs));
  });

  afterEach(() => {
    savedObjectsClient.update.resetHistory();
  });

  it('formats successful response', async () => {
    const request = {
      method: 'PUT',
      url: '/api/saved_objects/index-pattern/logstash-*',
      payload: {
        attributes: {
          title: 'Testing'
        }
      }
    };

    savedObjectsClient.update.returns(Promise.resolve(true));

    const { payload, statusCode } = await server.inject(request);
    const response = JSON.parse(payload);

    expect(statusCode).toBe(200);
    expect(response).toEqual(true);
  });

  it('calls upon savedObjectClient.update', async () => {
    const attributes = { title: 'Testing' };
    const options = { version: 2 };
    const request = {
      method: 'PUT',
      url: '/api/saved_objects/index-pattern/logstash-*',
      payload: {
        attributes,
        version: options.version
      }
    };

    await server.inject(request);
    expect(savedObjectsClient.update.calledOnce).toBe(true);

    const args = savedObjectsClient.update.getCall(0).args;
    expect(args).toEqual(['index-pattern', 'logstash-*', attributes, options]);
  });
});
