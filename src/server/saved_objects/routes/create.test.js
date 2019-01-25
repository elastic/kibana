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
import { createCreateRoute } from './create';
import { MockServer } from './_mock_server';

describe('POST /api/saved_objects/{type}', () => {
  const savedObjectsClient = { create: sinon.stub().returns('') };
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

    server.route(createCreateRoute(prereqs));
  });

  afterEach(() => {
    savedObjectsClient.create.resetHistory();
  });

  it('formats successful response', async () => {
    const request = {
      method: 'POST',
      url: '/api/saved_objects/index-pattern',
      payload: {
        attributes: {
          title: 'Testing'
        }
      }
    };
    const clientResponse = {
      type: 'index-pattern',
      id: 'logstash-*',
      title: 'Testing',
      references: [],
    };

    savedObjectsClient.create.returns(Promise.resolve(clientResponse));

    const { payload, statusCode } = await server.inject(request);
    const response = JSON.parse(payload);

    expect(statusCode).toBe(200);
    expect(response).toEqual(clientResponse);
  });

  it('requires attributes', async () => {
    const request = {
      method: 'POST',
      url: '/api/saved_objects/index-pattern',
      payload: {}
    };

    const { statusCode, payload } = await server.inject(request);
    const response = JSON.parse(payload);

    expect(response.validation.keys).toContain('attributes');
    expect(response.message).toMatch(/is required/);
    expect(response.statusCode).toBe(400);
    expect(statusCode).toBe(400);
  });

  it('calls upon savedObjectClient.create', async () => {
    const request = {
      method: 'POST',
      url: '/api/saved_objects/index-pattern',
      payload: {
        attributes: {
          title: 'Testing'
        }
      }
    };

    await server.inject(request);
    expect(savedObjectsClient.create.calledOnce).toBe(true);

    const args = savedObjectsClient.create.getCall(0).args;
    const options = { overwrite: false, id: undefined, migrationVersion: undefined, references: [] };
    const attributes = { title: 'Testing' };

    expect(args).toEqual(['index-pattern', attributes, options]);
  });

  it('can specify an id', async () => {
    const request = {
      method: 'POST',
      url: '/api/saved_objects/index-pattern/logstash-*',
      payload: {
        attributes: {
          title: 'Testing'
        }
      }
    };

    await server.inject(request);
    expect(savedObjectsClient.create.calledOnce).toBe(true);

    const args = savedObjectsClient.create.getCall(0).args;
    const options = { overwrite: false, id: 'logstash-*', references: [] };
    const attributes = { title: 'Testing' };

    expect(args).toEqual(['index-pattern', attributes, options]);
  });
});
