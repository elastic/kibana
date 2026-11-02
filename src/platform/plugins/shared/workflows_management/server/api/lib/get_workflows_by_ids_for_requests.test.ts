/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { WorkflowDetailDto } from '@kbn/workflows';
import { getWorkflowsByIdsForRequests } from './get_workflows_by_ids_for_requests';

const workflow = (id: string) => ({ id } as unknown as WorkflowDetailDto);

describe('getWorkflowsByIdsForRequests', () => {
  const requestA = { id: 'a' } as unknown as KibanaRequest;
  const requestB = { id: 'b' } as unknown as KibanaRequest;

  it('reads once per space and filters each lookup by its ids and read permission', async () => {
    const getWorkflowsByIds = jest.fn(async (ids: string[]) => ids.map(workflow));
    const toDto = jest.fn(async (w: WorkflowDetailDto, request?: KibanaRequest) => ({
      ...w,
      permissions: { read: !(request === requestB && w.id === 'wf-2') },
    }));

    const results = await getWorkflowsByIdsForRequests(
      { getWorkflowsByIds, getAccessControl: async () => ({ toDto } as never) },
      [
        { ids: ['wf-1', 'wf-2'], spaceId: 'default', request: requestA },
        { ids: ['wf-2'], spaceId: 'default', request: requestB },
      ]
    );

    expect(getWorkflowsByIds).toHaveBeenCalledTimes(1);
    expect(getWorkflowsByIds).toHaveBeenCalledWith(['wf-1', 'wf-2'], 'default');
    expect(results).toEqual([
      {
        status: 'fulfilled',
        value: [expect.objectContaining({ id: 'wf-1' }), expect.objectContaining({ id: 'wf-2' })],
      },
      { status: 'fulfilled', value: [] },
    ]);
  });

  it('settles a failing space as rejected without failing the others', async () => {
    const getWorkflowsByIds = jest.fn(async (ids: string[], spaceId: string) => {
      if (spaceId === 'bad') throw new Error('search failed');
      return ids.map(workflow);
    });
    const toDto = jest.fn(async (w: WorkflowDetailDto) => ({ ...w, permissions: { read: true } }));

    const results = await getWorkflowsByIdsForRequests(
      { getWorkflowsByIds, getAccessControl: async () => ({ toDto } as never) },
      [
        { ids: ['wf-1'], spaceId: 'default', request: requestA },
        { ids: ['wf-1'], spaceId: 'bad', request: requestA },
      ]
    );

    expect(results[0].status).toBe('fulfilled');
    expect(results[1].status).toBe('rejected');
  });
});
