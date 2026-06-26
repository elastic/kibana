/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ChangeHistoryDocument } from '@kbn/change-history';
import { httpServerMock } from '@kbn/core/server/mocks';
import { WorkflowNotFoundError } from '@kbn/workflows/common/errors';
import { InvalidYamlSchemaError } from '@kbn/workflows-yaml';

import type { WorkflowCrudDeps } from './types';
import type { IWorkflowChangeHistoryService } from './workflow_change_history_types';
import { WorkflowCrudService } from './workflow_crud_service';
import {
  WORKFLOW_CHANGE_HISTORY_OBJECT_TYPE,
  WorkflowChangeHistoryAction,
} from '../../common/lib/workflow_change_history/constants';
import { WorkflowChangeHistoryDisabledError } from '../lib/workflow_change_history_disabled_error';
import { WorkflowHistoryEventNotFoundError } from '../lib/workflow_history_event_not_found_error';

const makeHistoryEvent = (overrides: Partial<ChangeHistoryDocument> = {}): ChangeHistoryDocument =>
  ({
    '@timestamp': '2026-01-01T00:00:00.000Z',
    event: {
      id: 'event-v3',
      action: 'update',
      module: 'stack',
      dataset: 'workflows',
      type: 'change',
    },
    object: {
      id: 'wf-1',
      type: WORKFLOW_CHANGE_HISTORY_OBJECT_TYPE,
      sequence: 3,
      snapshot: { yaml: 'name: Restored workflow' },
      hash: 'hash',
      fields: { hashed: [] },
    },
    user: { name: 'alice' },
    ecs: { version: '9.3.0' },
    service: { type: 'kibana', version: '9.0.0' },
    ...overrides,
  } as ChangeHistoryDocument);

const makeChangeHistoryService = (
  overrides: Partial<IWorkflowChangeHistoryService> = {}
): IWorkflowChangeHistoryService => ({
  isInitialized: () => true,
  initialize: jest.fn(),
  getHistory: jest.fn().mockResolvedValue({
    total: 1,
    items: [makeHistoryEvent()],
  }),
  asScoped: jest.fn(),
  asSystemUser: jest.fn(),
  ...overrides,
});

type RestoreTestDepsOverrides = Omit<Partial<WorkflowCrudDeps>, 'changeHistoryService'> & {
  changeHistoryService?: Partial<IWorkflowChangeHistoryService>;
};

describe('WorkflowCrudService.restoreWorkflowVersion', () => {
  const request = httpServerMock.createKibanaRequest();

  const makeService = (depsOverrides: RestoreTestDepsOverrides = {}) => {
    const { changeHistoryService: changeHistoryOverrides, ...restOverrides } = depsOverrides;
    const changeHistoryService = makeChangeHistoryService(changeHistoryOverrides);
    const getHistory = changeHistoryService.getHistory as jest.Mock;

    const deps = {
      changeHistoryService,
      workflowVersioningEnabled: true,
      ...restOverrides,
    } as WorkflowCrudDeps;

    const service = new WorkflowCrudService(deps);
    jest.spyOn(service, 'getWorkflow').mockResolvedValue({ id: 'wf-1' } as any);
    const applyWorkflowUpdate = jest
      .spyOn(service as any, 'applyWorkflowUpdate')
      .mockResolvedValue({
        response: {
          id: 'wf-1',
          lastUpdatedAt: '2026-01-02T00:00:00.000Z',
          lastUpdatedBy: 'alice',
          enabled: true,
          valid: true,
          validationErrors: [],
        },
        finalData: { version: 8 } as any,
        timestamp: new Date('2026-01-02T00:00:00.000Z'),
      });
    const logWorkflowChangesAfterWrite = jest
      .spyOn(service, 'logWorkflowChangesAfterWrite')
      .mockResolvedValue();

    return { service, getHistory, applyWorkflowUpdate, logWorkflowChangesAfterWrite };
  };

  it('restores snapshot yaml via applyWorkflowUpdate and logs restore change history', async () => {
    const { service, getHistory, applyWorkflowUpdate, logWorkflowChangesAfterWrite } =
      makeService();

    const result = await service.restoreWorkflowVersion('wf-1', 'event-v3', 'default', request);

    expect(getHistory).toHaveBeenCalledWith('default', 'wf-1', {
      additionalFilters: [{ term: { 'event.id': 'event-v3' } }],
      size: 1,
    });
    expect(applyWorkflowUpdate).toHaveBeenCalledWith(
      'wf-1',
      { yaml: 'name: Restored workflow' },
      'default',
      request
    );
    expect(logWorkflowChangesAfterWrite).toHaveBeenCalledWith({
      workflows: [{ id: 'wf-1', document: { version: 8 } }],
      action: WorkflowChangeHistoryAction.workflowRestore,
      spaceId: 'default',
      timestamp: new Date('2026-01-02T00:00:00.000Z'),
      request,
      restoreMetadata: {
        eventId: 'event-v3',
        sequence: 3,
      },
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: 'wf-1',
        version: 8,
      })
    );
  });

  it('throws when workflow is not found', async () => {
    const { service } = makeService();
    jest.spyOn(service, 'getWorkflow').mockResolvedValue(null);

    await expect(
      service.restoreWorkflowVersion('missing', 'event-v3', 'default', request)
    ).rejects.toThrow(WorkflowNotFoundError);
  });

  it('throws when history event is not found', async () => {
    const { service } = makeService({
      changeHistoryService: {
        getHistory: jest.fn().mockResolvedValue({ total: 0, items: [] }),
      },
    });

    await expect(
      service.restoreWorkflowVersion('wf-1', 'missing-event', 'default', request)
    ).rejects.toThrow(WorkflowHistoryEventNotFoundError);
  });

  it('throws when snapshot yaml is missing', async () => {
    const { service } = makeService({
      changeHistoryService: {
        getHistory: jest.fn().mockResolvedValue({
          total: 1,
          items: [
            makeHistoryEvent({
              object: {
                id: 'wf-1',
                type: WORKFLOW_CHANGE_HISTORY_OBJECT_TYPE,
                snapshot: {},
                hash: 'hash',
                fields: { hashed: [] },
              },
            }),
          ],
        }),
      },
    });

    await expect(
      service.restoreWorkflowVersion('wf-1', 'event-v3', 'default', request)
    ).rejects.toThrow(InvalidYamlSchemaError);
  });

  it('throws when versioning is disabled', async () => {
    const { service } = makeService({
      workflowVersioningEnabled: false,
      changeHistoryService: {
        getHistory: jest.fn(),
      },
    });

    await expect(
      service.restoreWorkflowVersion('wf-1', 'event-v3', 'default', request)
    ).rejects.toThrow(WorkflowChangeHistoryDisabledError);
  });
});
