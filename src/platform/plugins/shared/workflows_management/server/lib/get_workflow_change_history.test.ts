/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ChangeHistoryDocument } from '@kbn/change-history';
import { WorkflowNotFoundError } from '@kbn/workflows/common/errors';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';

import {
  assertWorkflowChangeHistoryEnabled,
  assertWorkflowHistoryPaginationWithinWindow,
  getHistoryForWorkflow,
} from './get_workflow_change_history';
import { WorkflowChangeHistoryDisabledError } from './workflow_change_history_disabled_error';
import { WorkflowHistoryPaginationError } from './workflow_history_pagination_error';
import type { IWorkflowChangeHistoryService } from '../services/workflow_change_history_types';

const createHistoryDocument = (eventId: string, sequence: number): ChangeHistoryDocument => ({
  '@timestamp': '2026-06-17T10:00:00.000Z',
  ecs: { version: '9.3.0' },
  user: { name: 'alice' },
  event: {
    id: eventId,
    module: 'stack',
    dataset: 'workflows',
    action: 'workflow_update',
    type: 'change',
  },
  object: {
    id: 'wf-1',
    type: 'workflow',
    hash: 'abc',
    sequence,
    fields: { hashed: [], redacted: [] },
    snapshot: {
      name: 'My workflow',
      enabled: true,
      tags: [],
      yaml: 'name: My workflow',
      version: sequence,
      valid: true,
    },
  },
  service: { type: 'kibana', version: '9.4.0' },
});

describe('get_workflow_change_history', () => {
  const workflow = {
    id: 'wf-1',
    name: 'My workflow',
    enabled: true,
    createdAt: '2026-06-17T10:00:00.000Z',
    createdBy: 'alice',
    lastUpdatedAt: '2026-06-17T10:00:00.000Z',
    lastUpdatedBy: 'alice',
    definition: null,
    yaml: 'name: My workflow',
    valid: true,
    spaceId: 'default',
  };

  const createDeps = ({
    initialized = true,
    historyResult = { total: 0, items: [] as ChangeHistoryDocument[] },
    workflowResult = workflow,
  }: {
    initialized?: boolean;
    historyResult?: { total: number; items: ChangeHistoryDocument[] };
    workflowResult?: typeof workflow | null;
  } = {}) => {
    const changeHistoryService = {
      isInitialized: jest.fn().mockReturnValue(initialized),
      getHistory: jest.fn().mockResolvedValue(historyResult),
    } as unknown as IWorkflowChangeHistoryService;

    return {
      deps: {
        changeHistoryService,
        getWorkflowSource: jest.fn().mockResolvedValue(workflowResult),
      },
      changeHistoryService,
    };
  };

  describe('assertWorkflowChangeHistoryEnabled', () => {
    it('throws when change history is not initialized', () => {
      const { deps } = createDeps({ initialized: false });

      expect(() => assertWorkflowChangeHistoryEnabled(deps.changeHistoryService)).toThrow(
        new WorkflowChangeHistoryDisabledError()
      );
    });
  });

  describe('assertWorkflowHistoryPaginationWithinWindow', () => {
    it('allows pagination at the Elasticsearch max result window boundary', () => {
      expect(() => assertWorkflowHistoryPaginationWithinWindow(100, 100)).not.toThrow();
    });

    it('throws when pagination exceeds the Elasticsearch max result window', () => {
      expect(() => assertWorkflowHistoryPaginationWithinWindow(101, 100)).toThrow(
        new WorkflowHistoryPaginationError()
      );
    });
  });

  describe('getHistoryForWorkflow', () => {
    it('throws when change history is not initialized', async () => {
      const { deps } = createDeps({ initialized: false });

      await expect(
        getHistoryForWorkflow(deps, { workflowId: 'wf-1', spaceId: 'default' })
      ).rejects.toThrow(new WorkflowChangeHistoryDisabledError());
    });
    it('returns mapped history entries with page/perPage and matching version', async () => {
      const historyDocument = createHistoryDocument('event-1', 2);
      const { deps, changeHistoryService } = createDeps({
        historyResult: { total: 1, items: [historyDocument] },
      });

      const result = await getHistoryForWorkflow(deps, {
        workflowId: 'wf-1',
        spaceId: 'default',
        page: 2,
        perPage: 10,
      });

      expect(changeHistoryService.getHistory).toHaveBeenCalledWith('default', 'wf-1', {
        from: 10,
        size: 10,
      });
      expect(result).toEqual({
        page: 2,
        perPage: 10,
        total: 1,
        items: [
          expect.objectContaining({
            id: 'event-1',
            version: 2,
            workflow: { yaml: 'name: My workflow' },
          }),
        ],
      });
    });

    it('uses default pagination when omitted', async () => {
      const { deps, changeHistoryService } = createDeps();

      await getHistoryForWorkflow(deps, {
        workflowId: 'wf-1',
        spaceId: 'default',
      });

      expect(changeHistoryService.getHistory).toHaveBeenCalledWith('default', 'wf-1', {
        from: 0,
        size: 20,
      });
    });

    it('queries global history for a global workflow visible from the request space', async () => {
      const { deps, changeHistoryService } = createDeps({
        workflowResult: {
          ...workflow,
          spaceId: GLOBAL_WORKFLOW_SPACE_ID,
        },
      });

      await getHistoryForWorkflow(deps, {
        workflowId: 'wf-1',
        spaceId: 'default',
      });

      expect(changeHistoryService.getHistory).toHaveBeenCalledWith(
        GLOBAL_WORKFLOW_SPACE_ID,
        'wf-1',
        {
          from: 0,
          size: 20,
        }
      );
    });

    it('throws WorkflowNotFoundError when workflow does not exist', async () => {
      const { deps } = createDeps({ workflowResult: null });

      await expect(
        getHistoryForWorkflow(deps, { workflowId: 'missing', spaceId: 'default' })
      ).rejects.toBeInstanceOf(WorkflowNotFoundError);
    });

    it('returns history when the workflow source exists (including soft-deleted tombstones)', async () => {
      const historyDocument = createHistoryDocument('event-1', 2);
      const { deps, changeHistoryService } = createDeps({
        workflowResult: {
          ...workflow,
          spaceId: 'default',
        },
        historyResult: { total: 1, items: [historyDocument] },
      });

      const result = await getHistoryForWorkflow(deps, {
        workflowId: 'wf-1',
        spaceId: 'default',
      });

      expect(deps.getWorkflowSource).toHaveBeenCalledWith('wf-1', 'default');
      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(changeHistoryService.getHistory).toHaveBeenCalled();
    });

    it('throws WorkflowHistoryPaginationError before querying when page exceeds the result window', async () => {
      const { deps, changeHistoryService } = createDeps();

      await expect(
        getHistoryForWorkflow(deps, {
          workflowId: 'wf-1',
          spaceId: 'default',
          page: 101,
          perPage: 100,
        })
      ).rejects.toThrow(new WorkflowHistoryPaginationError());

      expect(deps.getWorkflowSource).not.toHaveBeenCalled();
      expect(changeHistoryService.getHistory).not.toHaveBeenCalled();
    });

    it('allows pagination at the Elasticsearch max result window boundary', async () => {
      const { deps, changeHistoryService } = createDeps();

      await getHistoryForWorkflow(deps, {
        workflowId: 'wf-1',
        spaceId: 'default',
        page: 100,
        perPage: 100,
      });

      expect(deps.getWorkflowSource).toHaveBeenCalledWith('wf-1', 'default');
      expect(changeHistoryService.getHistory).toHaveBeenCalledWith('default', 'wf-1', {
        from: 9_900,
        size: 100,
      });
    });

    it('throws WorkflowHistoryPaginationError when from plus size exceeds the window', async () => {
      const { deps, changeHistoryService } = createDeps();

      await expect(
        getHistoryForWorkflow(deps, {
          workflowId: 'wf-1',
          spaceId: 'default',
          page: 1,
          perPage: 10_001,
        })
      ).rejects.toThrow(new WorkflowHistoryPaginationError());

      expect(changeHistoryService.getHistory).not.toHaveBeenCalled();
    });

    it('returns empty list when no history exists', async () => {
      const { deps } = createDeps();

      const result = await getHistoryForWorkflow(deps, {
        workflowId: 'wf-1',
        spaceId: 'default',
      });

      expect(result).toEqual({ page: 1, perPage: 20, total: 0, items: [] });
    });
  });
});
