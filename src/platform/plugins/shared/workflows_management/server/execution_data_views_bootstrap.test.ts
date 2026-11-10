/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import { loggerMock } from '@kbn/logging-mocks';
import { ExecutionDataViewsBootstrap } from './execution_data_views_bootstrap';
import {
  WORKFLOWS_EXECUTIONS_DATA_VIEW_TITLE,
  WORKFLOWS_EXECUTIONS_INDEX,
  WORKFLOWS_STEP_EXECUTIONS_DATA_VIEW_TITLE,
} from '../common';

const flushPromises = async (): Promise<void> => {
  await new Promise<void>((resolve) => setImmediate(resolve));
};

const createExistingDataView = ({
  id,
  title,
  allowHidden,
}: {
  id: string;
  title: string;
  allowHidden: boolean;
}): DataView => {
  let indexPattern = title;
  let hidden = allowHidden;
  return {
    id,
    getIndexPattern: () => indexPattern,
    getAllowHidden: () => hidden,
    setIndexPattern: (next: string) => {
      indexPattern = next;
    },
    setAllowHidden: (next: boolean) => {
      hidden = next;
    },
  } as unknown as DataView;
};

describe('ExecutionDataViewsBootstrap', () => {
  const savedObjectsClient = {} as SavedObjectsClientContract;
  const esClient = {} as ElasticsearchClient;

  const createDataViewsPlugin = (dataViewsService: {
    get: jest.Mock;
    create: jest.Mock;
    createSavedObject: jest.Mock;
    updateSavedObject?: jest.Mock;
  }) =>
    ({
      dataViewsServiceFactory: jest.fn().mockResolvedValue(dataViewsService),
    } as unknown as DataViewsServerPluginStart);

  it('creates two managed data views for the space', async () => {
    const dataViewsService = {
      get: jest.fn().mockRejectedValue(new Error('Saved object [index-pattern/id] not found')),
      create: jest.fn().mockImplementation(async (spec) => spec),
      createSavedObject: jest.fn().mockResolvedValue(undefined),
      updateSavedObject: jest.fn(),
    };
    const dataViewsPlugin = createDataViewsPlugin(dataViewsService);
    const bootstrap = new ExecutionDataViewsBootstrap(dataViewsPlugin, loggerMock.create());

    bootstrap.ensureForSpaceFireAndForget('marketing', savedObjectsClient, esClient);
    await flushPromises();

    expect(dataViewsPlugin.dataViewsServiceFactory).toHaveBeenCalledWith(
      savedObjectsClient,
      esClient,
      undefined,
      true
    );
    expect(dataViewsService.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        id: 'workflows-executions-managed-marketing',
        title: WORKFLOWS_EXECUTIONS_DATA_VIEW_TITLE,
        timeFieldName: 'startedAt',
        allowNoIndex: true,
        allowHidden: true,
        managed: true,
        namespaces: ['marketing'],
      }),
      true
    );
    expect(dataViewsService.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        id: 'workflows-step-executions-managed-marketing',
        title: WORKFLOWS_STEP_EXECUTIONS_DATA_VIEW_TITLE,
        allowHidden: true,
        managed: true,
        namespaces: ['marketing'],
      }),
      true
    );
    expect(dataViewsService.createSavedObject).toHaveBeenCalledTimes(2);
    expect(dataViewsService.updateSavedObject).not.toHaveBeenCalled();
  });

  it('updates existing data views that still target the plain index', async () => {
    const executionsView = createExistingDataView({
      id: 'workflows-executions-managed-marketing',
      title: WORKFLOWS_EXECUTIONS_INDEX,
      allowHidden: false,
    });
    const stepExecutionsView = createExistingDataView({
      id: 'workflows-step-executions-managed-marketing',
      title: '.workflows-step-executions',
      allowHidden: false,
    });
    const dataViewsService = {
      get: jest
        .fn()
        .mockResolvedValueOnce(executionsView)
        .mockResolvedValueOnce(stepExecutionsView),
      create: jest.fn(),
      createSavedObject: jest.fn(),
      updateSavedObject: jest.fn().mockResolvedValue(undefined),
    };
    const dataViewsPlugin = createDataViewsPlugin(dataViewsService);
    const bootstrap = new ExecutionDataViewsBootstrap(dataViewsPlugin, loggerMock.create());

    bootstrap.ensureForSpaceFireAndForget('marketing', savedObjectsClient, esClient);
    await flushPromises();

    expect(dataViewsService.create).not.toHaveBeenCalled();
    expect(dataViewsService.updateSavedObject).toHaveBeenCalledTimes(2);
    expect(executionsView.getIndexPattern()).toBe(WORKFLOWS_EXECUTIONS_DATA_VIEW_TITLE);
    expect(executionsView.getAllowHidden()).toBe(true);
    expect(stepExecutionsView.getIndexPattern()).toBe(WORKFLOWS_STEP_EXECUTIONS_DATA_VIEW_TITLE);
    expect(stepExecutionsView.getAllowHidden()).toBe(true);
  });

  it('does not rewrite existing data views that already match', async () => {
    const dataViewsService = {
      get: jest.fn().mockImplementation(async (id: string) =>
        createExistingDataView({
          id,
          title:
            id === 'workflows-executions-managed-marketing'
              ? WORKFLOWS_EXECUTIONS_DATA_VIEW_TITLE
              : WORKFLOWS_STEP_EXECUTIONS_DATA_VIEW_TITLE,
          allowHidden: true,
        })
      ),
      create: jest.fn(),
      createSavedObject: jest.fn(),
      updateSavedObject: jest.fn(),
    };
    const dataViewsPlugin = createDataViewsPlugin(dataViewsService);
    const bootstrap = new ExecutionDataViewsBootstrap(dataViewsPlugin, loggerMock.create());

    bootstrap.ensureForSpaceFireAndForget('marketing', savedObjectsClient, esClient);
    await flushPromises();

    expect(dataViewsService.create).not.toHaveBeenCalled();
    expect(dataViewsService.updateSavedObject).not.toHaveBeenCalled();
  });

  it('deduplicates concurrent requests for one space', async () => {
    const dataViewsService = {
      get: jest.fn().mockImplementation(async (id: string) =>
        createExistingDataView({
          id,
          title:
            id === 'workflows-executions-managed-marketing'
              ? WORKFLOWS_EXECUTIONS_DATA_VIEW_TITLE
              : WORKFLOWS_STEP_EXECUTIONS_DATA_VIEW_TITLE,
          allowHidden: true,
        })
      ),
      create: jest.fn(),
      createSavedObject: jest.fn(),
      updateSavedObject: jest.fn(),
    };
    const dataViewsPlugin = createDataViewsPlugin(dataViewsService);
    const bootstrap = new ExecutionDataViewsBootstrap(dataViewsPlugin, loggerMock.create());

    bootstrap.ensureForSpaceFireAndForget('marketing', savedObjectsClient, esClient);
    bootstrap.ensureForSpaceFireAndForget('marketing', savedObjectsClient, esClient);
    await flushPromises();

    expect(dataViewsPlugin.dataViewsServiceFactory).toHaveBeenCalledTimes(1);
  });

  it('accepts a duplicate error only when the expected ID exists', async () => {
    const duplicateError = Object.assign(new Error('duplicate data view'), {
      name: 'DuplicateDataViewError',
    });
    let isFirstGet = true;
    const dataViewsService = {
      get: jest.fn().mockImplementation(async (id: string) => {
        if (isFirstGet) {
          isFirstGet = false;
          throw new Error('Saved object not found');
        }
        return createExistingDataView({
          id,
          title: id.includes('step-executions')
            ? WORKFLOWS_STEP_EXECUTIONS_DATA_VIEW_TITLE
            : WORKFLOWS_EXECUTIONS_DATA_VIEW_TITLE,
          allowHidden: true,
        });
      }),
      create: jest.fn().mockImplementation(async (spec) => spec),
      createSavedObject: jest.fn().mockRejectedValue(duplicateError),
      updateSavedObject: jest.fn(),
    };
    const dataViewsPlugin = createDataViewsPlugin(dataViewsService);
    const logger = loggerMock.create();
    const bootstrap = new ExecutionDataViewsBootstrap(dataViewsPlugin, logger);

    bootstrap.ensureForSpaceFireAndForget('marketing', savedObjectsClient, esClient);
    await flushPromises();
    bootstrap.ensureForSpaceFireAndForget('marketing', savedObjectsClient, esClient);
    await flushPromises();

    expect(dataViewsPlugin.dataViewsServiceFactory).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('does not cache a duplicate name with a different ID', async () => {
    const duplicateError = Object.assign(new Error('duplicate data view'), {
      name: 'DuplicateDataViewError',
    });
    const dataViewsService = {
      get: jest.fn().mockRejectedValue(new Error('Saved object not found')),
      create: jest.fn().mockImplementation(async (spec) => spec),
      createSavedObject: jest.fn().mockRejectedValue(duplicateError),
      updateSavedObject: jest.fn(),
    };
    const dataViewsPlugin = createDataViewsPlugin(dataViewsService);
    const logger = loggerMock.create();
    const bootstrap = new ExecutionDataViewsBootstrap(dataViewsPlugin, logger);

    bootstrap.ensureForSpaceFireAndForget('marketing', savedObjectsClient, esClient);
    await flushPromises();
    bootstrap.ensureForSpaceFireAndForget('marketing', savedObjectsClient, esClient);
    await flushPromises();

    expect(dataViewsPlugin.dataViewsServiceFactory).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('duplicate data view'));
  });

  it('does not cache a failed bootstrap', async () => {
    const dataViewsService = {
      get: jest
        .fn()
        .mockRejectedValueOnce(new Error('unavailable'))
        .mockImplementation(async (id: string) =>
          createExistingDataView({
            id,
            title:
              id === 'workflows-executions-managed-marketing'
                ? WORKFLOWS_EXECUTIONS_DATA_VIEW_TITLE
                : WORKFLOWS_STEP_EXECUTIONS_DATA_VIEW_TITLE,
            allowHidden: true,
          })
        ),
      create: jest.fn(),
      createSavedObject: jest.fn(),
      updateSavedObject: jest.fn(),
    };
    const dataViewsPlugin = createDataViewsPlugin(dataViewsService);
    const logger = loggerMock.create();
    const bootstrap = new ExecutionDataViewsBootstrap(dataViewsPlugin, logger);

    bootstrap.ensureForSpaceFireAndForget('marketing', savedObjectsClient, esClient);
    await flushPromises();
    bootstrap.ensureForSpaceFireAndForget('marketing', savedObjectsClient, esClient);
    await flushPromises();

    expect(dataViewsPlugin.dataViewsServiceFactory).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('unavailable'));
  });
});
