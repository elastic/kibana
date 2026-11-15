/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { runStep } from '../types';
import { createTestContext, KIBANA_VERSION } from '../test_helpers/context';
import { createIOStub, success } from '../test_helpers/io';
import { existingIndexState } from '../test_helpers/state';
import * as CLEANUP from './cleanup_unknown_and_excluded_docs';

describe('CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS', () => {
  const unknownDocs = [
    { id: 'unknown:1', type: 'unknown' },
    { id: 'unknown:2', type: 'unknown' },
    { id: 'other:1', type: 'other' },
  ];
  const cleanupStarted = success({
    cleanup: {
      type: 'cleanup_started' as const,
      unknownDocs: [],
      errorsByType: {},
      taskId: 'delete-task',
    },
    unknownDocs,
  });

  const runCleanup = async (discardUnknownObjects?: string, hasDeletedDocs?: boolean) => {
    const context = createTestContext({ migrationConfig: { discardUnknownObjects } });
    const io = createIOStub(context);
    io.cleanupUnknownAndExcludedDocs.mockResolvedValue(cleanupStarted);
    const state: CLEANUP.State = {
      ...existingIndexState(context),
      controlState: CLEANUP.Name,
      hasDeletedDocs,
    };
    return { io, next: await runStep(CLEANUP.step(state, io, context)) };
  };

  it.each([
    ['unset', undefined],
    ['set to another version', '9.3.0'],
  ])(
    'keeps the documents of unknown types, and warns about them, when the flag is %s',
    async (_, flag) => {
      const { io, next } = await runCleanup(flag);

      expect(io.cleanupUnknownAndExcludedDocs).toHaveBeenCalledWith('.kibana_1', false);
      expect(next).toMatchObject({
        controlState: 'CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_WAIT_FOR_TASK',
        deleteTaskId: 'delete-task',
      });
      expect(next.logs).toEqual([
        {
          level: 'warning',
          message: expect.stringContaining(
            'contains documents of unknown types, which have been kept: unknown (2), other (1)'
          ),
        },
      ]);
    }
  );

  it('discards the documents of unknown types when the flag matches the Kibana version', async () => {
    const { io, next } = await runCleanup(KIBANA_VERSION);

    expect(io.cleanupUnknownAndExcludedDocs).toHaveBeenCalledWith('.kibana_1', true);
    expect(next.logs).toEqual([
      { level: 'warning', message: expect.stringContaining('unknown:1') },
    ]);
  });

  it('refreshes the index when a previous attempt already deleted documents', async () => {
    const context = createTestContext();
    const io = createIOStub(context);
    const state: CLEANUP.State = {
      ...existingIndexState(context),
      controlState: CLEANUP.Name,
      hasDeletedDocs: true,
    };

    const next = await runStep(CLEANUP.step(state, io, context));
    expect(next.controlState).toBe('CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_REFRESH');
  });
});
