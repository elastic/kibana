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
import { createBulkCreateRoute } from './bulk_create';
import { MockServer } from './_mock_server';

describe('POST /api/saved_objects/_bulk_create', () => {
  const savedObjectsClient = { bulkCreate: sinon.stub().returns('') };
  let server;

  beforeEach(() => {
    server = new MockServer();

    const prereqs = {
      getSavedObjectsClient: {
        assign: 'savedObjectsClient',
        method() {
          return savedObjectsClient;
        }
      },
    };

    server.route(createBulkCreateRoute(prereqs));
  });

  afterEach(() => {
    savedObjectsClient.bulkCreate.resetHistory();
  });

  it('formats successful response', async () => {
    const request = {
      method: 'POST',
      url: '/api/saved_objects/_bulk_create',
      payload: [{
        id: 'abc123',
        type: 'index-pattern',
        attributes: {
          title: 'my_title',
        },
      }]
    };

    const clientResponse = {
      saved_objects: [{
        id: 'abc123',
        type: 'index-pattern',
        title: 'logstash-*',
        version: 2,
        references: [],
      }]
    };

    savedObjectsClient.bulkCreate.returns(Promise.resolve(clientResponse));

    const { payload, statusCode } = await server.inject(request);
    const response = JSON.parse(payload);

    expect(statusCode).toBe(200);
    expect(response).toEqual(clientResponse);
  });

  it('calls upon savedObjectClient.bulkCreate', async () => {
    const docs = [{
      id: 'abc123',
      type: 'index-pattern',
      attributes: {
        title: 'foo',
      },
      references: [],
    }, {
      id: 'abc1234',
      type: 'index-pattern',
      attributes: {
        title: 'bar',
      },
      references: [],
    }];

    const request = {
      method: 'POST',
      url: '/api/saved_objects/_bulk_create',
      payload: docs,
    };

    await server.inject(request);
    expect(savedObjectsClient.bulkCreate.calledOnce).toBe(true);

    const args = savedObjectsClient.bulkCreate.getCall(0).args;
    expect(args[0]).toEqual(docs);
  });

  it('passes along the overwrite option', async () => {
    await server.inject({
      method: 'POST',
      url: '/api/saved_objects/_bulk_create?overwrite=true',
      payload: [{
        id: 'abc1234',
        type: 'index-pattern',
        attributes: {
          title: 'bar',
        },
        references: [],
      }]
    });

    expect(savedObjectsClient.bulkCreate.calledOnce).toBe(true);

    const args = savedObjectsClient.bulkCreate.getCall(0).args;
    expect(args[1]).toEqual({ overwrite: true });
  });
});
