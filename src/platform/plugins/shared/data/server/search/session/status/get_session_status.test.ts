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
              status: SearchStatus.COMPLETE,
            }),
            'with-error-but-good-status': createSearchSessionRequestInfoMock({
              status: SearchStatus.COMPLETE,
              error: 'Some error',
            }),
            'with-error-and-error-status': createSearchSessionRequestInfoMock({
              status: SearchStatus.ERROR,
              error: 'Some error',
            }),
          },
        });

        // When
        const res = await getSessionStatus(getDeps(), session, { preferCachedStatus: true });

        // Then
        expect(res).toEqual({
          status: SearchSessionStatus.COMPLETE,
          errors: ['Some error'],
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

  describe('when preferCachedStatus is false', () => {
    describe('when there are some errors', () => {
      it('should return an error status', async () => {
        // Given
        const deps = getDeps();
        mockGetSearchStatus.mockResolvedValue({ status: SearchStatus.ERROR, error: 'Some error' });
        const session = createSearchSessionSavedObjectAttributesMock({
          idMapping: {
            '1234': createSearchSessionRequestInfoMock(),
          },
        });

        // When
        const res = await getSessionStatus(deps, session, { preferCachedStatus: false });

        // Then
        expect(res).toEqual({
          status: SearchSessionStatus.ERROR,
          errors: ['Some error'],
          searchStatuses: [
            {
              ...session.idMapping['1234'],
              status: SearchStatus.ERROR,
              error: 'Some error',
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
        const res = await getSessionStatus(deps, session, { preferCachedStatus: false });

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
        const res = await getSessionStatus(deps, session, { preferCachedStatus: false });

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
