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

import supertest from 'supertest';
import { UnwrapPromise } from '@kbn/utility-types';
import { registerBulkCreateRoute } from '../bulk_create';
import { savedObjectsClientMock } from '../../../../../core/server/mocks';
import { setupServer } from '../test_utils';

type setupServerReturn = UnwrapPromise<ReturnType<typeof setupServer>>;

describe('POST /api/saved_objects/_bulk_create', () => {
  let server: setupServerReturn['server'];
  let httpSetup: setupServerReturn['httpSetup'];
  let handlerContext: setupServerReturn['handlerContext'];
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;

  beforeEach(async () => {
    ({ server, httpSetup, handlerContext } = await setupServer());
    savedObjectsClient = handlerContext.savedObjects.client;
    savedObjectsClient.bulkCreate.mockResolvedValue({ saved_objects: [] });

    const router = httpSetup.createRouter('/api/saved_objects/');
    registerBulkCreateRoute(router);

    await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  it('formats successful response', async () => {
    const clientResponse = {
      saved_objects: [
        {
          id: 'abc123',
          type: 'index-pattern',
          title: 'logstash-*',
          attributes: {},
          version: '2',
          references: [],
        },
      ],
    };
    savedObjectsClient.bulkCreate.mockResolvedValue(clientResponse);

    const result = await supertest(httpSetup.server.listener)
      .post('/api/saved_objects/_bulk_create')
      .send([
        {
          id: 'abc123',
          type: 'index-pattern',
          attributes: {
            title: 'my_title',
          },
        },
      ])
      .expect(200);

    expect(result.body).toEqual(clientResponse);
  });

  it('calls upon savedObjectClient.bulkCreate', async () => {
    const docs = [
      {
        id: 'abc123',
        type: 'index-pattern',
        attributes: {
          title: 'foo',
        },
        references: [],
      },
      {
        id: 'abc1234',
        type: 'index-pattern',
        attributes: {
          title: 'bar',
        },
        references: [],
      },
    ];

    await supertest(httpSetup.server.listener)
      .post('/api/saved_objects/_bulk_create')
      .send(docs)
      .expect(200);

    expect(savedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
    const args = savedObjectsClient.bulkCreate.mock.calls[0];
    expect(args[0]).toEqual(docs);
  });

  it('passes along the overwrite option', async () => {
    await supertest(httpSetup.server.listener)
      .post('/api/saved_objects/_bulk_create?overwrite=true')
      .send([
        {
          id: 'abc1234',
          type: 'index-pattern',
          attributes: {
            title: 'foo',
          },
          references: [],
        },
      ])
      .expect(200);

    expect(savedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
    const args = savedObjectsClient.bulkCreate.mock.calls[0];
    expect(args[1]).toEqual({ overwrite: true });
  });
});
