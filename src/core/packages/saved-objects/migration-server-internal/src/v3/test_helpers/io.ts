/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MockedLogger } from '@kbn/logging-mocks';
import type { SavedObjectsRawDoc } from '@kbn/core-saved-objects-server';
import type { FetchIndexResponse } from '../../actions';
import type { MigrationContext } from '../context';
import { createIO, type IO, type Success } from '../io';

export type IOStub = { [K in keyof IO]: jest.MockedFunction<IO[K]> };

export const success = <TValue>(value: TValue): Success<TValue> => ({ type: 'success', value });

export const retryableError = (message = 'es is unavailable') => ({
  type: 'retryable_es_client_error' as const,
  message,
});

/**
 * An IO layer that answers like a healthy cluster holding `indices`,
 * whose outdated documents are returned by the first read only.
 */
export const createIOStub = (
  context: MigrationContext,
  {
    indices = {},
    outdatedDocuments = [],
  }: { indices?: FetchIndexResponse; outdatedDocuments?: SavedObjectsRawDoc[] } = {}
): IOStub => ({
  fetchIndices: jest.fn().mockResolvedValue(success(indices)),
  checkClusterRoutingAllocation: jest.fn().mockResolvedValue(success({})),
  createIndex: jest.fn().mockResolvedValue(success('create_index_succeeded')),
  waitForYellowIndex: jest.fn().mockResolvedValue(success({})),
  updateMappings: jest
    .fn()
    .mockImplementation(async (_index, _mappings, pickupQuery) =>
      success(pickupQuery ? { taskId: 'pickup-task' } : {})
    ),
  waitForPickupMappingsTask: jest
    .fn()
    .mockResolvedValue(success('pickup_updated_mappings_succeeded')),
  updateIndexMeta: jest.fn().mockResolvedValue(success('update_mappings_succeeded')),
  updateAliases: jest.fn().mockResolvedValue(success('update_aliases_succeeded')),
  cleanupUnknownAndExcludedDocs: jest
    .fn()
    .mockResolvedValue(success({ cleanup: { type: 'cleanup_not_needed' }, unknownDocs: [] })),
  waitForDeleteByQueryTask: jest.fn().mockResolvedValue(success({ type: 'cleanup_successful' })),
  refreshIndex: jest.fn().mockResolvedValue(success({ refreshed: true })),
  openPit: jest.fn().mockResolvedValue(success({ pitId: 'pit-id' })),
  readWithPit: jest
    .fn()
    .mockResolvedValueOnce(
      success({
        outdatedDocuments,
        pitId: 'pit-id',
        lastHitSortValue: outdatedDocuments.length ? [1] : undefined,
        totalHits: outdatedDocuments.length,
      })
    )
    .mockResolvedValue(
      success({ outdatedDocuments: [], pitId: 'pit-id', lastHitSortValue: undefined, totalHits: 0 })
    ),
  // documents are transformed by the real migrations of the context's types
  transformDocs: jest.fn().mockImplementation(createIO(context).transformDocs),
  bulkIndex: jest.fn().mockResolvedValue(success('bulk_index_succeeded')),
  closePit: jest.fn().mockResolvedValue(success({})),
  noop: jest.fn().mockResolvedValue(success('noop')),
});

/** The control states the migration went through, as logged by the state transitions. */
export const getVisitedStates = (logger: MockedLogger): string[] => {
  const transitions = logger.debug.mock.calls
    .map(([message]) => (typeof message === 'string' ? /\] (\w+) -> (\w+)\./.exec(message) : null))
    .filter((match): match is RegExpExecArray => match !== null);
  return transitions.length ? [transitions[0][1], ...transitions.map(([, , to]) => to)] : [];
};
