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

import { PlainIndexEntityDataClient } from './plain_index_entity_data_client';
import {
  WORKFLOWS_EXECUTIONS_INDEX,
  WORKFLOWS_STEP_EXECUTIONS_INDEX,
} from '../../constants/execution_indexes';
import { WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS } from '../../mappings/step_executions_mappings';
import { WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS } from '../../mappings/workflow_executions_mappings';

describe('PlainIndexEntityDataClient', () => {
  it('creates workflow and step clients backed by their system indices', async () => {
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

    const logger = loggerMock.create();
    const workflow = new PlainIndexEntityDataClient({
      logger,
      indexName: WORKFLOWS_EXECUTIONS_INDEX,
      mappings: WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS,
    });
    const step = new PlainIndexEntityDataClient({
      logger,
      indexName: WORKFLOWS_STEP_EXECUTIONS_INDEX,
      mappings: WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS,
    });

    await expect(workflow.initSetup(coreSetup)).resolves.toBeUndefined();
    await expect(step.initSetup(coreSetup)).resolves.toBeUndefined();
    await expect(workflow.initStart(coreStart)).resolves.toBeUndefined();
    await expect(step.initStart(coreStart)).resolves.toBeUndefined();

    expect(esClient.indices.exists).toHaveBeenCalledWith({ index: WORKFLOWS_EXECUTIONS_INDEX });
    expect(esClient.indices.exists).toHaveBeenCalledWith({
      index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
    });

    const workflowExecutionsDataClient = workflow.createClient();
    const stepExecutionsDataClient = step.createClient();

    await workflowExecutionsDataClient.search({ query: { match_all: {} } });
    await stepExecutionsDataClient.search({ query: { match_all: {} } });

    expect(esClient.search).toHaveBeenNthCalledWith(1, {
      index: WORKFLOWS_EXECUTIONS_INDEX,
      query: { match_all: {} },
    });
    expect(esClient.search).toHaveBeenNthCalledWith(2, {
      index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
      query: { match_all: {} },
    });
  });
});
