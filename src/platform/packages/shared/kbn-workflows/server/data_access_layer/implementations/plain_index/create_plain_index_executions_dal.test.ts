/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';

import { PlainIndexExecutionsDalBundle } from './create_plain_index_executions_dal';
import { PlainIndexExecutionsDataAccess } from './plain_index_executions_data_access';
import {
  WORKFLOWS_EXECUTIONS_INDEX,
  WORKFLOWS_STEP_EXECUTIONS_INDEX,
} from '../../constants/execution_indexes';

describe('PlainIndexExecutionsDalBundle', () => {
  it('creates workflow and step DAL instances backed by their system indices', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValue({ hits: { hits: [] } } as never);
    esClient.indices.exists.mockResolvedValue(true as never);
    esClient.indices.putMapping.mockResolvedValue({ acknowledged: true } as never);

    const coreSetup = coreMock.createSetup();
    const coreStart = coreMock.createStart();
    Object.defineProperty(coreStart.elasticsearch.client, 'asInternalUser', {
      configurable: true,
      value: esClient,
    });
    coreSetup.getStartServices.mockResolvedValue([coreStart, {}, {}] as never);

    const logger = loggerMock.create();
    const bundle = new PlainIndexExecutionsDalBundle({
      source: 'system_index',
      coreSetup,
      logger,
    });

    const workflowExecutionsDal = await bundle.createWorkflowExecutionsDal();
    const stepExecutionsDal = await bundle.createStepExecutionsDal();

    expect(workflowExecutionsDal).toBeInstanceOf(PlainIndexExecutionsDataAccess);
    expect(stepExecutionsDal).toBeInstanceOf(PlainIndexExecutionsDataAccess);

    await workflowExecutionsDal.search({ query: { match_all: {} } });
    await stepExecutionsDal.search({ query: { match_all: {} } });

    expect(esClient.search).toHaveBeenNthCalledWith(1, {
      index: WORKFLOWS_EXECUTIONS_INDEX,
      query: { match_all: {} },
    });
    expect(esClient.search).toHaveBeenNthCalledWith(2, {
      index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
      query: { match_all: {} },
    });

    await expect(bundle.initSetup()).resolves.toBeUndefined();
    await expect(bundle.initStart()).resolves.toBeUndefined();

    expect(esClient.indices.exists).toHaveBeenCalledWith({ index: WORKFLOWS_EXECUTIONS_INDEX });
    expect(esClient.indices.exists).toHaveBeenCalledWith({
      index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
    });
  });
});
