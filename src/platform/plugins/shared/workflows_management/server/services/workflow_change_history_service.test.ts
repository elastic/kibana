/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ChangeHistoryClient } from '@kbn/change-history';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';

import {
  WORKFLOW_CHANGE_HISTORY_DATASET,
  WORKFLOW_CHANGE_HISTORY_MODULE,
  WORKFLOW_CHANGE_HISTORY_OBJECT_TYPE,
} from './workflow_change_history_constants';
import { WorkflowChangeHistoryService } from './workflow_change_history_service';

jest.mock('@kbn/change-history', () => {
  const actual = jest.requireActual('@kbn/change-history');
  return {
    ...actual,
    ChangeHistoryClient: jest.fn(),
  };
});

const MockedChangeHistoryClient = ChangeHistoryClient as jest.MockedClass<
  typeof ChangeHistoryClient
>;

describe('WorkflowChangeHistoryService', () => {
  const logger = loggerMock.create();
  const clientMock = {
    isInitialized: jest.fn().mockReturnValue(false),
    initialize: jest.fn().mockResolvedValue(undefined),
    log: jest.fn().mockResolvedValue(undefined),
    logBulk: jest.fn().mockResolvedValue(undefined),
    getHistory: jest.fn().mockResolvedValue({ total: 0, items: [] }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    MockedChangeHistoryClient.mockImplementation(
      () => clientMock as unknown as ChangeHistoryClient
    );
    clientMock.isInitialized.mockReturnValue(false);
  });

  it('constructs ChangeHistoryClient with stack module and workflows dataset', () => {
    new WorkflowChangeHistoryService(logger, '9.0.0');

    expect(MockedChangeHistoryClient).toHaveBeenCalledWith(
      expect.objectContaining({
        module: WORKFLOW_CHANGE_HISTORY_MODULE,
        dataset: WORKFLOW_CHANGE_HISTORY_DATASET,
        kibanaVersion: '9.0.0',
      })
    );
  });

  it('initializes the change history client with the elasticsearch client', async () => {
    const service = new WorkflowChangeHistoryService(logger, '9.0.0');
    const elasticsearchClient = elasticsearchServiceMock.createElasticsearchClient();
    const authService = {
      getCurrentUser: jest.fn().mockReturnValue({ username: 'alice', profile_uid: 'profile-1' }),
    };

    service.initialize({ elasticsearchClient, authService: authService as any });
    await Promise.resolve();

    expect(clientMock.initialize).toHaveBeenCalledWith(elasticsearchClient);
  });

  it('reports initialized state from the underlying client', () => {
    clientMock.isInitialized.mockReturnValue(true);
    const service = new WorkflowChangeHistoryService(logger, '9.0.0');

    expect(service.isInitialized()).toBe(true);
  });

  it('delegates getHistory with the workflow object type', async () => {
    const service = new WorkflowChangeHistoryService(logger, '9.0.0');

    await service.getHistory('default', 'wf-1', { size: 10 });

    expect(clientMock.getHistory).toHaveBeenCalledWith(
      'default',
      WORKFLOW_CHANGE_HISTORY_OBJECT_TYPE,
      'wf-1',
      { size: 10 }
    );
  });

  it('asScoped injects username and userProfileId from the request', async () => {
    const service = new WorkflowChangeHistoryService(logger, '9.0.0');
    const authService = {
      getCurrentUser: jest.fn().mockReturnValue({ username: 'alice', profile_uid: 'profile-1' }),
    };
    service.initialize({
      elasticsearchClient: elasticsearchServiceMock.createElasticsearchClient(),
      authService: authService as any,
    });

    const scoped = service.asScoped({} as any);
    await scoped.logBulk(
      [
        {
          objectId: 'wf-1',
          objectType: WORKFLOW_CHANGE_HISTORY_OBJECT_TYPE,
          snapshot: { name: 'A' },
        },
      ],
      { action: 'workflow_update', spaceId: 'default' }
    );

    expect(clientMock.logBulk).toHaveBeenCalledWith(
      [
        {
          objectId: 'wf-1',
          objectType: WORKFLOW_CHANGE_HISTORY_OBJECT_TYPE,
          snapshot: { name: 'A' },
        },
      ],
      {
        action: 'workflow_update',
        spaceId: 'default',
        username: 'alice',
        userProfileId: 'profile-1',
      }
    );
  });

  it('throws when asScoped is called before initialize', () => {
    const service = new WorkflowChangeHistoryService(logger, '9.0.0');

    expect(() => service.asScoped({} as any)).toThrow(/before initialize/);
  });
});
