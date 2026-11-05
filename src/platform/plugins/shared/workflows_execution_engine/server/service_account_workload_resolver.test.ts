/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolveWorkflowWorkloads } from './service_account_workload_resolver';

describe('resolveWorkflowWorkloads', () => {
  const signal = new AbortController().signal;

  it('reports each workflow in the order it was asked for, naming and linking the live ones', async () => {
    const repository = {
      getWorkflowStatuses: jest.fn().mockResolvedValue(
        new Map([
          ['marketing:w-1', { status: 'present', name: 'Weekly digest' }],
          ['default:w-1', { status: 'present', name: 'Nightly report' }],
          ['default:a/b c', { status: 'present', name: 'Odd id' }],
          ['default:gone', { status: 'missing' }],
          ['default:unreadable', { status: 'unknown' }],
          ['default:soft-deleted', { status: 'present' }],
        ])
      ),
    };

    await expect(
      resolveWorkflowWorkloads(
        repository,
        [
          { workloadId: 'w-1', spaceId: 'default' },
          { workloadId: 'gone', spaceId: 'default' },
          { workloadId: 'w-1', spaceId: 'marketing' },
          { workloadId: 'a/b c', spaceId: 'default' },
          { workloadId: 'unreadable', spaceId: 'default' },
          { workloadId: 'soft-deleted', spaceId: 'default' },
          { workloadId: 'not-in-the-map', spaceId: 'default' },
        ],
        { signal }
      )
    ).resolves.toEqual([
      { status: 'present', title: 'Nightly report', path: '/app/workflows/w-1' },
      { status: 'missing' },
      { status: 'present', title: 'Weekly digest', path: '/app/workflows/w-1' },
      { status: 'present', title: 'Odd id', path: '/app/workflows/a%2Fb%20c' },
      { status: 'unknown' },
      { status: 'present' },
      { status: 'unknown' },
    ]);
    expect(repository.getWorkflowStatuses).toHaveBeenCalledWith(
      [
        { workflowId: 'w-1', spaceId: 'default' },
        { workflowId: 'gone', spaceId: 'default' },
        { workflowId: 'w-1', spaceId: 'marketing' },
        { workflowId: 'a/b c', spaceId: 'default' },
        { workflowId: 'unreadable', spaceId: 'default' },
        { workflowId: 'soft-deleted', spaceId: 'default' },
        { workflowId: 'not-in-the-map', spaceId: 'default' },
      ],
      { signal }
    );
  });

  it('propagates a failed lookup', async () => {
    const error = new Error('boom');
    const repository = { getWorkflowStatuses: jest.fn().mockRejectedValue(error) };

    await expect(
      resolveWorkflowWorkloads(repository, [{ workloadId: 'w-1', spaceId: 'default' }], {
        signal,
      })
    ).rejects.toBe(error);
  });
});
