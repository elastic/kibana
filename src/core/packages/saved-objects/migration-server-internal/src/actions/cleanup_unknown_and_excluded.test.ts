/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Either from 'fp-ts/lib/Either';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { checkForUnknownDocs, type DocumentIdAndType } from './check_for_unknown_docs';
import { cleanupUnknownAndExcluded } from './cleanup_unknown_and_excluded';
import { calculateExcludeFilters } from './calculate_exclude_filters';
import { deleteByQuery } from './delete_by_query';
import {
  emptyResponseClientMock,
  initialExcludeOnUpgradeQueryMock,
} from './cleanup_unknown_and_excluded.mocks';

jest.mock('./check_for_unknown_docs');
jest.mock('./calculate_exclude_filters');
jest.mock('./delete_by_query');

const mockCheckForUnknownDocs = checkForUnknownDocs as jest.MockedFunction<
  typeof checkForUnknownDocs
>;

const mockCalculateExcludeFilters = calculateExcludeFilters as jest.MockedFunction<
  typeof calculateExcludeFilters
>;

const mockDeleteByQuery = deleteByQuery as jest.MockedFunction<typeof deleteByQuery>;

describe('cleanupUnknownAndExcluded', () => {
  const unknownDocs: DocumentIdAndType[] = [
    { id: 'dashboard:12345', type: 'dashboard' },
    { id: 'dashboard:67890', type: 'dashboard' },
  ];

  const excludeFromUpgradeFilterHooks = {
    'search-session': async () => {
      return {
        bool: {
          must: [
            { term: { type: 'search-session' } },
            { match: { 'search-session.persisted': false } },
          ],
        },
      };
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls `Actions.checkForUnknownDocs()` with the correct params', async () => {
    mockCheckForUnknownDocs.mockReturnValueOnce(async () => Either.right({}));
    mockCalculateExcludeFilters.mockReturnValueOnce(async () =>
      Either.right({
        filterClauses: [],
        errorsByType: {},
      })
    );
    mockDeleteByQuery.mockReturnValueOnce(async () =>
      Either.right({
        taskId: '1234',
      })
    );

    const task = cleanupUnknownAndExcluded({
      client: emptyResponseClientMock, // the client will not be called anyway
      indexName: '.kibana_8.0.0',
      discardUnknownDocs: false,
      excludeOnUpgradeQuery: initialExcludeOnUpgradeQueryMock,
      excludeFromUpgradeFilterHooks,
      hookTimeoutMs: 50,
      knownTypes: ['foo', 'bar'],
      removedTypes: ['server', 'deprecated'],
    });

    await task();

    expect(checkForUnknownDocs).toHaveBeenCalledTimes(1);
    expect(checkForUnknownDocs).toHaveBeenCalledWith({
      client: emptyResponseClientMock,
      indexName: '.kibana_8.0.0',
      excludeOnUpgradeQuery: initialExcludeOnUpgradeQueryMock,
      knownTypes: ['foo', 'bar'],
    });
  });

  it('fails if there are unknown docs and `discardUnknownDocs === false`', async () => {
    mockCheckForUnknownDocs.mockReturnValueOnce(async () =>
      Either.right({
        type: 'unknown_docs_found',
        unknownDocs,
      })
    );

    const task = cleanupUnknownAndExcluded({
      client: emptyResponseClientMock,
      indexName: '.kibana_8.0.0',
      discardUnknownDocs: false,
      excludeOnUpgradeQuery: initialExcludeOnUpgradeQueryMock,
      excludeFromUpgradeFilterHooks,
      hookTimeoutMs: 50,
      knownTypes: ['foo', 'bar'],
      removedTypes: ['server', 'deprecated'],
    });

    const result = await task();

    expect(Either.isLeft(result)).toBe(true);
    expect((result as Either.Left<any>).left).toEqual({
      type: 'unknown_docs_found',
      unknownDocs,
    });
    expect(calculateExcludeFilters).not.toHaveBeenCalled();
    expect(deleteByQuery).not.toHaveBeenCalled();
  });

  describe('if there are no unknown documents', () => {
    it('calls `Actions.calculateExcludeFilters()` with the correct params', async () => {
      mockCheckForUnknownDocs.mockReturnValueOnce(async () => Either.right({}));
      mockCalculateExcludeFilters.mockReturnValueOnce(async () =>
        Either.right({
          filterClauses: [],
          errorsByType: {},
        })
      );
      mockDeleteByQuery.mockReturnValueOnce(async () =>
        Either.right({
          taskId: '1234',
        })
      );
      const task = cleanupUnknownAndExcluded({
        client: emptyResponseClientMock,
        indexName: '.kibana_8.0.0',
        discardUnknownDocs: false,
        excludeOnUpgradeQuery: initialExcludeOnUpgradeQueryMock,
        excludeFromUpgradeFilterHooks,
        hookTimeoutMs: 50,
        knownTypes: ['foo', 'bar'],
        removedTypes: ['server', 'deprecated'],
      });

      await task();

      expect(calculateExcludeFilters).toHaveBeenCalledTimes(1);
      expect(calculateExcludeFilters).toHaveBeenCalledWith({
        client: emptyResponseClientMock,
        excludeFromUpgradeFilterHooks,
        hookTimeoutMs: 50,
      });
    });
  });

  describe('if there are unknown documents and `discardUnknownDocuments === true`', () => {
    it('calls `Actions.calculateExcludeFilters()` with the correct params', async () => {
      mockCheckForUnknownDocs.mockReturnValueOnce(async () =>
        Either.right({
          type: 'unknown_docs_found',
          unknownDocs,
        })
      );
      mockCalculateExcludeFilters.mockReturnValueOnce(async () =>
        Either.right({
          filterClauses: [],
          errorsByType: {},
        })
      );
      mockDeleteByQuery.mockReturnValueOnce(async () =>
        Either.right({
          taskId: '1234',
        })
      );
      const task = cleanupUnknownAndExcluded({
        client: emptyResponseClientMock,
        indexName: '.kibana_8.0.0',
        discardUnknownDocs: true,
        excludeOnUpgradeQuery: initialExcludeOnUpgradeQueryMock,
        excludeFromUpgradeFilterHooks,
        hookTimeoutMs: 28,
        knownTypes: ['foo', 'bar'],
        removedTypes: ['server', 'deprecated'],
      });

      await task();

      expect(calculateExcludeFilters).toHaveBeenCalledTimes(1);
      expect(calculateExcludeFilters).toHaveBeenCalledWith({
        client: emptyResponseClientMock,
        excludeFromUpgradeFilterHooks,
        hookTimeoutMs: 28,
      });
    });
  });

  it('calls `deleteByQuery` with the correct params', async () => {
    mockCheckForUnknownDocs.mockReturnValueOnce(async () =>
      Either.right({
        type: 'unknown_docs_found',
        unknownDocs,
      })
    );

    const filterClauses: QueryDslQueryContainer[] = [
      {
        bool: {
          must: [
            { term: { type: 'search-session' } },
            { match: { 'search-session.persisted': false } },
          ],
        },
      },
    ];

    const errorsByType = { type1: new Error('an error!') };

    mockCalculateExcludeFilters.mockReturnValueOnce(async () =>
      Either.right({ filterClauses, errorsByType })
    );
    mockDeleteByQuery.mockReturnValueOnce(async () =>
      Either.right({
        taskId: '1234',
      })
    );
    const task = cleanupUnknownAndExcluded({
      client: emptyResponseClientMock,
      indexName: '.kibana_8.0.0',
      discardUnknownDocs: true,
      excludeOnUpgradeQuery: initialExcludeOnUpgradeQueryMock,
      excludeFromUpgradeFilterHooks,
      hookTimeoutMs: 28,
      knownTypes: ['foo', 'bar'],
      removedTypes: ['server', 'deprecated'],
    });

    const result = await task();

    expect(deleteByQuery).toHaveBeenCalledTimes(1);
    expect(deleteByQuery).toHaveBeenCalledWith({
      client: emptyResponseClientMock,
      indexName: '.kibana_8.0.0',
      query: {
        bool: {
          should: [
            // excluded from upgrade hook response
            {
              bool: {
                must: [
                  { term: { type: 'search-session' } },
                  { match: { 'search-session.persisted': false } },
                ],
              },
            },
            { term: { type: 'server' } }, // removed type
            { term: { type: 'deprecated' } }, // removed type
            { term: { type: 'dashboard' } }, // unknown type
          ],
        },
      },
      conflicts: 'proceed',
      refresh: false,
    });

    expect(Either.isRight(result)).toBe(true);
    expect((result as Either.Right<any>).right).toEqual({
      type: 'cleanup_started' as const,
      taskId: '1234',
      unknownDocs,
      errorsByType,
    });
  });
});
