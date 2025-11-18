/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { getSessionStatus } from './get_session_status';
import type { SearchSessionSavedObjectAttributes } from '../../../common';
import { SearchSessionStatus } from '../../../common';
import moment from 'moment';
import type { SearchSessionsConfigSchema } from '../../config';
import { createSearchSessionSavedObjectAttributesMock } from './mocks';

const mockInProgressSearchResponse = {
  body: {
    is_partial: true,
    is_running: true,
  },
};

const mockErrorSearchResponse = {
  body: {
    is_partial: false,
    is_running: false,
    completion_status: 500,
  },
};

const mockCompletedSearchResponse = {
  body: {
    is_partial: false,
    is_running: false,
    completion_status: 200,
  },
};

describe('getSessionStatus', () => {
  beforeEach(() => {
    deps.esClient.asyncSearch.status.mockReset();
  });

  const mockConfig = {} as unknown as SearchSessionsConfigSchema;
  const deps = {
    esClient: elasticsearchServiceMock.createElasticsearchClient(),
  };

  describe('when there are no searches inside the session', () => {
    describe('when the search is brand new', () => {
      test('returns an in_progress status', async () => {
        const session = createSearchSessionSavedObjectAttributesMock({
          idMapping: {},
          created: moment().toISOString(),
        });
        expect(await getSessionStatus(deps, session, mockConfig)).toEqual({
          status: SearchSessionStatus.IN_PROGRESS,
        });
      });
    });

    describe('when the search is has been created for a few seconds', () => {
      test('returns an error status', async () => {
        const session = createSearchSessionSavedObjectAttributesMock({
          idMapping: {},
          created: moment().subtract(1, 'minutes').toISOString(),
        });
        expect(await getSessionStatus(deps, session, mockConfig)).toEqual({
          status: SearchSessionStatus.ERROR,
        });
      });
    });
  });

  test("returns an error status if there's at least one error", async () => {
    deps.esClient.asyncSearch.status.mockImplementation(async ({ id }): Promise<any> => {
      switch (id) {
        case 'a':
          return mockInProgressSearchResponse;
        case 'b':
          return mockErrorSearchResponse;
        case 'c':
          return mockCompletedSearchResponse;
        default:
          // eslint-disable-next-line no-console
          console.error('Not mocked search id');
          throw new Error('Not mocked search id');
      }
    });
    const session: any = {
      idMapping: {
        a: {
          id: 'a',
        },
        b: { id: 'b' },
        c: { id: 'c' },
      },
    };
    expect(await getSessionStatus(deps, session, mockConfig)).toEqual({
      status: SearchSessionStatus.ERROR,
      errors: ['Search b completed with a 500 status'],
    });
  });

  test('expires a session if expired < now', async () => {
    const session: any = {
      idMapping: {},
      expires: moment().subtract(2, 'm'),
    };

    expect(await getSessionStatus(deps, session, mockConfig)).toEqual({
      status: SearchSessionStatus.EXPIRED,
    });
  });

  test('doesnt expire if expire > now', async () => {
    deps.esClient.asyncSearch.status.mockResolvedValue(mockInProgressSearchResponse as any);

    const session: any = {
      idMapping: {
        a: { id: 'a' },
      },
      expires: moment().add(2, 'm'),
    };
    expect(await getSessionStatus(deps, session, mockConfig)).toEqual({
      status: SearchSessionStatus.IN_PROGRESS,
    });
  });

  test('returns cancelled status if session was cancelled', async () => {
    const session: Partial<SearchSessionSavedObjectAttributes> = {
      idMapping: {
        a: { id: 'a', strategy: 'ese' },
      },
      isCanceled: true,
      expires: moment().subtract(2, 'm').toISOString(),
    };
    expect(
      await getSessionStatus(deps, session as SearchSessionSavedObjectAttributes, mockConfig)
    ).toEqual({ status: SearchSessionStatus.CANCELLED });
  });

  test('returns a complete status if all are complete', async () => {
    deps.esClient.asyncSearch.status.mockResolvedValue(mockCompletedSearchResponse as any);

    const session: any = {
      idMapping: {
        a: { id: 'a' },
        b: { id: 'b' },
        c: { id: 'c' },
      },
    };
    expect(await getSessionStatus(deps, session, mockConfig)).toEqual({
      status: SearchSessionStatus.COMPLETE,
    });
  });

  test('returns a running status if some are still running', async () => {
    deps.esClient.asyncSearch.status.mockImplementation(async ({ id }): Promise<any> => {
      switch (id) {
        case 'a':
          return mockInProgressSearchResponse;
        default:
          return mockCompletedSearchResponse;
      }
    });

    const session: any = {
      idMapping: {
        a: { id: 'a' },
        b: { id: 'b' },
        c: { id: 'c' },
      },
    };
    expect(await getSessionStatus(deps, session, mockConfig)).toEqual({
      status: SearchSessionStatus.IN_PROGRESS,
    });
  });
});
