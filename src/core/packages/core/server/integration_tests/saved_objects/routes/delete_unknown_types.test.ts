/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import supertest from 'supertest';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { typeRegistryMock } from '@kbn/core-saved-objects-base-server-mocks';
import type { SetupServerReturn } from '@kbn/core-test-helpers-test-utils';
import { setupServer } from '@kbn/core-test-helpers-test-utils';
import type { SavedObjectsType } from '../../..';
import {
  registerDeleteUnknownTypesRoute,
  type InternalSavedObjectsRequestHandlerContext,
} from '@kbn/core-saved-objects-server-internal';

describe('POST /internal/saved_objects/deprecations/_delete_unknown_types', () => {
  const kibanaVersion = '8.0.0';

  let server: SetupServerReturn['server'];
  let createRouter: SetupServerReturn['createRouter'];
  let handlerContext: SetupServerReturn['handlerContext'];
  let typeRegistry: ReturnType<typeof typeRegistryMock.create>;
  let elasticsearchClient: ReturnType<typeof elasticsearchServiceMock.createScopedClusterClient>;

  beforeEach(async () => {
    ({ server, createRouter, handlerContext } = await setupServer());
    elasticsearchClient = elasticsearchServiceMock.createScopedClusterClient();
    typeRegistry = typeRegistryMock.create();

    typeRegistry.getAllTypes.mockReturnValue([{ name: 'known-type' } as SavedObjectsType]);
    typeRegistry.getIndex.mockImplementation((type) => `${type}-index`);

    handlerContext.savedObjects.typeRegistry = typeRegistry;
    handlerContext.elasticsearch.client.asCurrentUser = elasticsearchClient.asCurrentUser;
    handlerContext.elasticsearch.client.asInternalUser = elasticsearchClient.asInternalUser;

    const router = createRouter<InternalSavedObjectsRequestHandlerContext>(
      '/internal/saved_objects/'
    );
    registerDeleteUnknownTypesRoute(router, {
      kibanaVersion,
    });

    await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  it('formats successful response', async () => {
    const result = await supertest(server.listener)
      .post('/internal/saved_objects/deprecations/_delete_unknown_types')
      .set('x-elastic-internal-origin', 'kibana')
      .expect(200);

    expect(result.body).toEqual({ success: true });
  });

  it('calls upon esClient.deleteByQuery', async () => {
    await supertest(server.listener)
      .post('/internal/saved_objects/deprecations/_delete_unknown_types')
      .set('x-elastic-internal-origin', 'kibana')
      .expect(200);

    expect(elasticsearchClient.asInternalUser.deleteByQuery).toHaveBeenCalledTimes(1);
    expect(elasticsearchClient.asInternalUser.deleteByQuery).toHaveBeenCalledWith({
      ignore_unavailable: true,
      index: [
        '.kibana_8.0.0',
        '.kibana_task_manager_8.0.0',
        '.kibana_alerting_cases_8.0.0',
        '.kibana_ingest_8.0.0',
        '.kibana_security_solution_8.0.0',
        '.kibana_analytics_8.0.0',
        '.kibana_usage_counters_8.0.0',
        '.kibana_search_solution_8.0.0',
      ],
      wait_for_completion: false,
      query: {
        bool: {
          must_not: [{ term: { type: 'known-type' } }],
        },
      },
    });
  });
});
