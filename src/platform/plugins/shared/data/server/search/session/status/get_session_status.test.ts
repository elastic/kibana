/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { SearchSessionStatus, SearchStatus } from '../../../../common';
import moment from 'moment';
import {
  createSearchSessionRequestInfoMock,
  createSearchSessionSavedObjectAttributesMock,
} from '../mocks';
import { getSessionStatus } from './get_session_status';
import { getSearchStatus } from './get_search_status';

jest.mock('./get_search_status');
const mockGetSearchStatus = jest.mocked(getSearchStatus);

const getDeps = () => {
  return {
    esClient: elasticsearchServiceMock.createElasticsearchClient(),
  };
};

describe('getSessionStatus', () => {
  describe('when the session is cancelled', () => {
    it('should return cancelled status', async () => {
      // Given
      const deps = getDeps();
      const session = createSearchSessionSavedObjectAttributesMock({
        isCanceled: true,
      });

      // When
      const res = await getSessionStatus(deps, session, { preferCachedStatus: false });

      // Then
      expect(res).toEqual({ status: SearchSessionStatus.CANCELLED });
    });
  });

  describe('when the expiration time is in the past', () => {
    it('should return expired status', async () => {
      // Given
      const deps = getDeps();
      const session = createSearchSessionSavedObjectAttributesMock({
        expires: moment().subtract(1, 'minutes').toISOString(),
      });

      // When
      const res = await getSessionStatus(deps, session, { preferCachedStatus: false });

      // Then
      expect(res).toEqual({ status: SearchSessionStatus.EXPIRED });
    });
  });

  describe('when there are no searches inside the session', () => {
    describe('when the search is brand new', () => {
      it('should return an in_progress status', async () => {
        // Given
        const session = createSearchSessionSavedObjectAttributesMock({
          idMapping: {},
          created: moment().toISOString(),
        });

        // When
        const res = await getSessionStatus(getDeps(), session, { preferCachedStatus: false });

        // Then
        expect(res).toEqual(
          expect.objectContaining({
            status: SearchSessionStatus.IN_PROGRESS,
          })
        );
      });
    });

    describe('when the search is has been created for a few seconds', () => {
      it('should return an error status', async () => {
        // Given
        const session = createSearchSessionSavedObjectAttributesMock({
          idMapping: {},
          created: moment().subtract(1, 'minutes').toISOString(),
        });

        // When
        const res = await getSessionStatus(getDeps(), session, { preferCachedStatus: false });

        // Then
        expect(res).toEqual({
          status: SearchSessionStatus.ERROR,
        });
      });
    });
  });

  describe('when preferCachedStatus is true', () => {
    describe('when the status is cached', () => {
      it('should return the cached status', async () => {
        // Given
        const session = createSearchSessionSavedObjectAttributesMock({
          status: SearchSessionStatus.COMPLETE,
          idMapping: {
            'complete-status': createSearchSessionRequestInfoMock({
              id: 'complete-status',
              status: SearchStatus.COMPLETE,
            }),
            'with-error-but-good-status': createSearchSessionRequestInfoMock({
              id: 'with-error-but-good-status',
              status: SearchStatus.COMPLETE,
              error: { code: 400 },
            }),
            'with-error-and-error-status': createSearchSessionRequestInfoMock({
              id: 'with-error-and-error-status',
              status: SearchStatus.ERROR,
              error: { code: 500 },
            }),
          },
        });

        // When
        const res = await getSessionStatus(getDeps(), session, { preferCachedStatus: true });

        // Then
        expect(res).toEqual({
          status: SearchSessionStatus.COMPLETE,
          searchStatuses: [
            {
              id: 'complete-status',
              status: SearchStatus.COMPLETE,
              strategy: 'esql_async',
            },
            {
              id: 'with-error-but-good-status',
              status: SearchStatus.COMPLETE,
              strategy: 'esql_async',
              error: { code: 400 },
            },
            {
              id: 'with-error-and-error-status',
              status: SearchStatus.ERROR,
              strategy: 'esql_async',
              error: { code: 500 },
            },
          ],
        });
      });
    });

    describe('when the status is not cached', () => {
      it('should compute the status normally', async () => {
        // Given
        const deps = getDeps();
        mockGetSearchStatus.mockResolvedValue({
          status: SearchStatus.COMPLETE,
        });
        const session = createSearchSessionSavedObjectAttributesMock({
          status: undefined,
          idMapping: {
            '1234': createSearchSessionRequestInfoMock(),
          },
        });

        // When
        const res = await getSessionStatus(deps, session, { preferCachedStatus: true });

        // Then
        expect(res).toEqual(
          expect.objectContaining({
            status: SearchSessionStatus.COMPLETE,
          })
        );
        expect(mockGetSearchStatus).toHaveBeenCalledWith({
          esClient: deps.esClient,
          asyncId: '1234',
          search: session.idMapping['1234'],
        });
      });
    });
  });

  describe.each([
    { value: { preferCachedStatus: false }, description: 'false' },
    { value: undefined, description: 'not present' },
  ])('when preferCachedStatus is $description', ({ value }) => {
    describe('when there are some errors', () => {
      it('should return an error status', async () => {
        // Given
        const deps = getDeps();
        mockGetSearchStatus.mockResolvedValue({
          status: SearchStatus.ERROR,
          error: { code: 500 },
        });
        const session = createSearchSessionSavedObjectAttributesMock({
          idMapping: {
            '1234': createSearchSessionRequestInfoMock(),
          },
        });

        // When
        const res = await getSessionStatus(deps, session, value);

        // Then
        expect(res).toEqual({
          status: SearchSessionStatus.ERROR,
          searchStatuses: [
            {
              ...session.idMapping['1234'],
              status: SearchStatus.ERROR,
              error: { code: 500 },
            },
          ],
        });
      });
    });

    describe('when all searches are complete', () => {
      it('should return a complete status', async () => {
        // Given
        const deps = getDeps();
        mockGetSearchStatus.mockResolvedValue({ status: SearchStatus.COMPLETE });
        const session = createSearchSessionSavedObjectAttributesMock({
          idMapping: {
            '1234': createSearchSessionRequestInfoMock(),
            '5678': createSearchSessionRequestInfoMock(),
          },
        });

        // When
        const res = await getSessionStatus(deps, session, value);

        // Then
        expect(res).toEqual({
          status: SearchSessionStatus.COMPLETE,
          searchStatuses: [
            {
              ...session.idMapping['1234'],
              status: SearchStatus.COMPLETE,
            },
            {
              ...session.idMapping['5678'],
              status: SearchStatus.COMPLETE,
            },
          ],
        });
      });
    });

    describe('when some searches are still in progress', () => {
      it('should return an in_progress status', async () => {
        // Given
        const deps = getDeps();
        mockGetSearchStatus.mockImplementation(async ({ search }) => {
          if (search.id === '1234') {
            return { status: SearchStatus.IN_PROGRESS };
          }
          return { status: SearchStatus.COMPLETE };
        });
        const session = createSearchSessionSavedObjectAttributesMock({
          idMapping: {
            '1234': createSearchSessionRequestInfoMock({ id: '1234' }),
            '5678': createSearchSessionRequestInfoMock({ id: '5678' }),
          },
        });

        // When
        const res = await getSessionStatus(deps, session, value);

        // Then
        expect(res).toEqual({
          status: SearchSessionStatus.IN_PROGRESS,
          searchStatuses: [
            {
              ...session.idMapping['1234'],
              status: SearchStatus.IN_PROGRESS,
            },
            {
              ...session.idMapping['5678'],
              status: SearchStatus.COMPLETE,
            },
          ],
        });
      });
    });
  });
});
