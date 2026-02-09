/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { getSessionStatus } from './get_session_status';
import {
  createSearchSessionRequestInfoMock,
  createSearchSessionSavedObjectAttributesMock,
} from '../mocks';
import type { SearchSessionSavedObjectAttributes } from '../../../../common';
import { SEARCH_SESSION_TYPE, SearchSessionStatus, SearchStatus } from '../../../../common';
import { updateSessionStatus } from './update_session_status';
import type { SavedObject } from '@kbn/core/server';

jest.mock('./get_session_status');
const getSessionStatusMock = jest.mocked(getSessionStatus);

const getSavedObjectMock = (overrides: Partial<SearchSessionSavedObjectAttributes> = {}) => {
  return {
    id: 'session-id',
    type: SEARCH_SESSION_TYPE,
    attributes: createSearchSessionSavedObjectAttributesMock(overrides),
  } as SavedObject<SearchSessionSavedObjectAttributes>;
};

const getDeps = () => {
  return {
    esClient: elasticsearchServiceMock.createElasticsearchClient(),
    savedObjectsClient: savedObjectsClientMock.create(),
  };
};

describe('getSessionStatus', () => {
  describe('when there are no updated id mappings and the status has not changed', () => {
    it('should not update the saved object', async () => {
      // Given
      const deps = getDeps();
      const session = getSavedObjectMock({
        status: SearchSessionStatus.COMPLETE,
      });
      getSessionStatusMock.mockResolvedValue({
        status: SearchSessionStatus.COMPLETE,
      });

      // When
      const res = await updateSessionStatus(deps, session);

      // Then
      expect(res).toEqual({
        status: SearchSessionStatus.COMPLETE,
      });
      expect(deps.savedObjectsClient.update).not.toHaveBeenCalled();
    });
  });

  describe('when the status has changed', () => {
    it('should update the saved object', async () => {
      // Given
      const deps = getDeps();
      const session = getSavedObjectMock({
        status: SearchSessionStatus.IN_PROGRESS,
      });
      getSessionStatusMock.mockResolvedValue({
        status: SearchSessionStatus.COMPLETE,
      });

      // When
      const res = await updateSessionStatus(deps, session);

      // Then
      expect(res).toEqual({
        status: SearchSessionStatus.COMPLETE,
      });
      expect(deps.savedObjectsClient.update).toHaveBeenCalledWith(
        SEARCH_SESSION_TYPE,
        session.id,
        expect.objectContaining({
          status: SearchSessionStatus.COMPLETE,
        })
      );
    });
  });

  describe('when there are updated id mappings', () => {
    it('should update the saved object', async () => {
      // Given
      const deps = getDeps();
      const session = getSavedObjectMock({
        idMapping: {
          'search-1': createSearchSessionRequestInfoMock({
            id: 'search-1',
            status: SearchStatus.IN_PROGRESS,
          }),
        },
      });
      getSessionStatusMock.mockResolvedValue({
        status: SearchSessionStatus.IN_PROGRESS,
        searchStatuses: [{ id: 'search-1', status: SearchStatus.COMPLETE, strategy: 'esql_async' }],
      });

      // When
      const res = await updateSessionStatus(deps, session);

      // Then
      expect(res).toEqual({
        status: SearchSessionStatus.IN_PROGRESS,
        searchStatuses: [{ id: 'search-1', status: SearchStatus.COMPLETE, strategy: 'esql_async' }],
      });
      expect(deps.savedObjectsClient.update).toHaveBeenCalledWith(
        SEARCH_SESSION_TYPE,
        session.id,
        expect.objectContaining({
          status: SearchSessionStatus.IN_PROGRESS,
          idMapping: {
            'search-1': expect.objectContaining({
              status: SearchStatus.COMPLETE,
            }),
          },
        })
      );
    });
  });

  describe('when the status and the id mappings are updated', () => {
    it('should update the saved object', async () => {
      // Given
      const deps = getDeps();
      const session = getSavedObjectMock({
        idMapping: {
          'search-1': createSearchSessionRequestInfoMock({
            id: 'search-1',
            status: SearchStatus.IN_PROGRESS,
          }),
        },
      });
      getSessionStatusMock.mockResolvedValue({
        status: SearchSessionStatus.COMPLETE,
        searchStatuses: [{ id: 'search-1', status: SearchStatus.COMPLETE, strategy: 'esql_async' }],
      });

      // When
      const res = await updateSessionStatus(deps, session);

      // Then
      expect(res).toEqual({
        status: SearchSessionStatus.COMPLETE,
        searchStatuses: [{ id: 'search-1', status: SearchStatus.COMPLETE, strategy: 'esql_async' }],
      });
      expect(deps.savedObjectsClient.update).toHaveBeenCalledWith(
        SEARCH_SESSION_TYPE,
        session.id,
        expect.objectContaining({
          status: SearchSessionStatus.COMPLETE,
          idMapping: {
            'search-1': expect.objectContaining({
              status: SearchStatus.COMPLETE,
            }),
          },
        })
      );
    });
  });
});
