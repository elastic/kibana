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
import { registerGetRoute } from '../get';
import { ContextService } from '../../../context';
import { savedObjectsClientMock } from '../../service/saved_objects_client.mock';
import { HttpService, InternalHttpServiceSetup } from '../../../http';
import { createHttpServer, createCoreContext } from '../../../http/test_utils';
import { coreMock } from '../../../mocks';

const coreId = Symbol('core');

describe('GET /api/saved_objects/{type}/{id}', () => {
  let server: HttpService;
  let httpSetup: InternalHttpServiceSetup;
  let handlerContext: ReturnType<typeof coreMock.createRequestHandlerContext>;
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;

  beforeEach(async () => {
    const coreContext = createCoreContext({ coreId });
    server = createHttpServer(coreContext);

    const contextService = new ContextService(coreContext);
    httpSetup = await server.setup({
      context: contextService.setup({ pluginDependencies: new Map() }),
    });

    handlerContext = coreMock.createRequestHandlerContext();
    savedObjectsClient = handlerContext.savedObjects.client;

    httpSetup.registerRouteHandlerContext(coreId, 'core', async (ctx, req, res) => {
      return handlerContext;
    });

    const router = httpSetup.createRouter('/api/saved_objects/');
    registerGetRoute(router);

    await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  it('formats successful response', async () => {
    const clientResponse = {
      id: 'logstash-*',
      title: 'logstash-*',
      type: 'logstash-type',
      attributes: {},
      timeFieldName: '@timestamp',
      notExpandable: true,
      references: [],
    };

    savedObjectsClient.get.mockResolvedValue(clientResponse);

    const result = await supertest(httpSetup.server.listener)
      .get('/api/saved_objects/index-pattern/logstash-*')
      .expect(200);

    expect(result.body).toEqual(clientResponse);
  });

  it('calls upon savedObjectClient.get', async () => {
    await supertest(httpSetup.server.listener)
      .get('/api/saved_objects/index-pattern/logstash-*')
      .expect(200);

    expect(savedObjectsClient.get).toHaveBeenCalled();

    const args = savedObjectsClient.get.mock.calls[0];
    expect(args).toEqual(['index-pattern', 'logstash-*']);
  });
});
