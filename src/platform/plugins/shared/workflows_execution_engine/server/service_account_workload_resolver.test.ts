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

  it('names and links each workflow in the order it was asked for', async () => {
    const repository = {
      getWorkflowNames: jest.fn().mockResolvedValue(
        new Map([
          ['marketing:w-1', 'Weekly digest'],
          ['default:w-1', 'Nightly report'],
          ['default:a/b c', 'Odd id'],
        ])
      ),
    };

    await expect(
      resolveWorkflowWorkloads(
        repository,
        [
          { workloadId: 'w-1', spaceId: 'default' },
          { workloadId: 'missing', spaceId: 'default' },
          { workloadId: 'w-1', spaceId: 'marketing' },
          { workloadId: 'a/b c', spaceId: 'default' },
        ],
        { signal }
      )
    ).resolves.toEqual([
      { title: 'Nightly report', path: '/app/workflows/w-1' },
      undefined,
      { title: 'Weekly digest', path: '/app/workflows/w-1' },
      { title: 'Odd id', path: '/app/workflows/a%2Fb%20c' },
    ]);
    expect(repository.getWorkflowNames).toHaveBeenCalledWith(
      [
        { workflowId: 'w-1', spaceId: 'default' },
        { workflowId: 'missing', spaceId: 'default' },
        { workflowId: 'w-1', spaceId: 'marketing' },
        { workflowId: 'a/b c', spaceId: 'default' },
      ],
      { signal }
    );
  });

  it('propagates a failed lookup', async () => {
    const error = new Error('boom');
    const repository = { getWorkflowNames: jest.fn().mockRejectedValue(error) };

    await expect(
      resolveWorkflowWorkloads(repository, [{ workloadId: 'w-1', spaceId: 'default' }], {
        signal,
      })
    ).rejects.toBe(error);
  });
});
