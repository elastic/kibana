/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  SAMPLE_WORKFLOW_ID,
  sampleWorkflowHistoryResponse,
} from './fixtures/sample_workflow_history_items';
import { createWorkflowChangeHistoryAdapter } from './workflow_change_history_adapter';
import { WORKFLOW_CHANGE_HISTORY_INTERNAL_API_VERSION } from '../../../common/lib/workflow_change_history/constants';

describe('createWorkflowChangeHistoryAdapter', () => {
  it('fetches paginated history with 1-based API page numbers', async () => {
    const http = {
      get: jest.fn().mockResolvedValue(sampleWorkflowHistoryResponse),
    };

    const adapter = createWorkflowChangeHistoryAdapter(http as never);

    const result = await adapter.listChanges({
      objectId: SAMPLE_WORKFLOW_ID,
      page: { index: 0, size: 20 },
    });

    expect(http.get).toHaveBeenCalledWith(
      `/internal/workflows/workflow/${SAMPLE_WORKFLOW_ID}/history`,
      {
        query: { page: 1, per_page: 20 },
        version: WORKFLOW_CHANGE_HISTORY_INTERNAL_API_VERSION,
        signal: undefined,
      }
    );
    expect(result.total).toBe(2);
    expect(result.items[0]).toMatchObject({
      id: 'evt-current',
      isCurrent: true,
      metadata: { version: 3 },
    });
    expect(result.items[1]?.isCurrent).toBeUndefined();
  });

  it('returns cached detail from list rows without a dedicated detail route', async () => {
    const http = {
      get: jest.fn().mockResolvedValue(sampleWorkflowHistoryResponse),
    };

    const adapter = createWorkflowChangeHistoryAdapter(http as never);

    await adapter.listChanges({
      objectId: SAMPLE_WORKFLOW_ID,
      page: { index: 0, size: 20 },
    });

    await expect(
      adapter.getChange({
        objectId: SAMPLE_WORKFLOW_ID,
        changeId: 'evt-previous',
      })
    ).resolves.toMatchObject({
      id: 'evt-previous',
      snapshot: {
        workflow: {
          yaml: 'name: original\n',
        },
      },
    });
  });

  it('throws when getChange is called before the row was loaded', async () => {
    const adapter = createWorkflowChangeHistoryAdapter({ get: jest.fn() } as never);

    await expect(
      adapter.getChange({
        objectId: SAMPLE_WORKFLOW_ID,
        changeId: 'missing-event',
      })
    ).rejects.toThrow('Workflow change "missing-event" is not loaded');
  });
});
