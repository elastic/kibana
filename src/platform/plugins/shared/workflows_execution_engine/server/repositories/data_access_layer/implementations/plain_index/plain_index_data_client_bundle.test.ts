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

import { PlainIndexDataClientBundle } from './plain_index_data_client_bundle';
import { DeferredDataClient } from '../deferred_data_client';
import {
  WORKFLOWS_EXECUTIONS_INDEX,
  WORKFLOWS_STEP_EXECUTIONS_INDEX,
} from '../../constants/execution_indexes';

describe('PlainIndexDataClientBundle', () => {
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

    const logger = loggerMock.create();
    const bundle = new PlainIndexDataClientBundle({ source: 'system_index', logger });

    await expect(bundle.initSetup(coreSetup)).resolves.toBeUndefined();
    await expect(bundle.initStart(coreStart)).resolves.toBeUndefined();

    expect(esClient.indices.exists).toHaveBeenCalledWith({ index: WORKFLOWS_EXECUTIONS_INDEX });
    expect(esClient.indices.exists).toHaveBeenCalledWith({
      index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
    });

    const workflowExecutionsDataClient = bundle.createWorkflowDataClient();
    const stepExecutionsDataClient = bundle.createStepDataClient();

    expect(workflowExecutionsDataClient).toBeInstanceOf(DeferredDataClient);
    expect(stepExecutionsDataClient).toBeInstanceOf(DeferredDataClient);

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

  it('operations queue until index creation finishes', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValue({ hits: { hits: [] } } as never);

    let resolveIndexCreation!: () => void;
    esClient.indices.exists.mockReturnValue(
      new Promise<boolean>((resolve) => {
        resolveIndexCreation = () => resolve(true);
      }) as never
    );

    const coreStart = coreMock.createStart();
    Object.defineProperty(coreStart.elasticsearch.client, 'asInternalUser', {
      configurable: true,
      value: esClient,
    });

    const logger = loggerMock.create();
    const bundle = new PlainIndexDataClientBundle({ source: 'system_index', logger });

    bundle.initStart(coreStart);

    const workflowClient = bundle.createWorkflowDataClient();
    const searchPromise = workflowClient.search({ query: { match_all: {} } });

    expect(esClient.search).not.toHaveBeenCalled();

    resolveIndexCreation();
    await searchPromise;

    expect(esClient.search).toHaveBeenCalledTimes(1);
  });

  it('throws if createWorkflowDataClient is called before initStart', () => {
    const logger = loggerMock.create();
    const bundle = new PlainIndexDataClientBundle({ source: 'system_index', logger });
    expect(() => bundle.createWorkflowDataClient()).toThrow(
      'initStart must be called before creating data clients'
    );
  });

  it('throws if createStepDataClient is called before initStart', () => {
    const logger = loggerMock.create();
    const bundle = new PlainIndexDataClientBundle({ source: 'system_index', logger });
    expect(() => bundle.createStepDataClient()).toThrow(
      'initStart must be called before creating data clients'
    );
  });
});
