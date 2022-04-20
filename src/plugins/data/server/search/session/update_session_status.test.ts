/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { bulkUpdateSessions, updateSessionStatus } from './update_session_status';
import { SearchSessionStatus, SearchSessionSavedObjectAttributes } from '@kbn/data-plugin/common';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { SearchStatus } from './types';
import moment from 'moment';
import {
  SavedObjectsBulkUpdateObject,
  SavedObjectsClientContract,
  SavedObjectsFindResult,
} from '@kbn/core/server';

describe('bulkUpdateSessions', () => {
  let mockClient: any;
  const mockConfig: any = {};
  let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  const mockLogger: any = {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(() => {
    savedObjectsClient = savedObjectsClientMock.create();
    mockClient = {
      asyncSearch: {
        status: jest.fn(),
        delete: jest.fn(),
      },
      eql: {
        status: jest.fn(),
        delete: jest.fn(),
      },
    };
  });

  describe('updateSessionStatus', () => {
    test('updates expired session', async () => {
      const so: SavedObjectsFindResult<SearchSessionSavedObjectAttributes> = {
        id: '123',
        attributes: {
          persisted: false,
          status: SearchSessionStatus.IN_PROGRESS,
          expires: moment().subtract(moment.duration(5, 'd')),
          idMapping: {
            'search-hash': {
              id: 'search-id',
              strategy: 'cool',
              status: SearchStatus.IN_PROGRESS,
            },
          },
        },
      } as any;

      const updated = await updateSessionStatus(
        {
          savedObjectsClient,
          client: mockClient,
          logger: mockLogger,
        },
        mockConfig,
        so
      );

      expect(updated).toBeTruthy();
      expect(so.attributes.status).toBe(SearchSessionStatus.EXPIRED);
    });

    test('does nothing if the search is still running', async () => {
      const so = {
        id: '123',
        attributes: {
          persisted: false,
          status: SearchSessionStatus.IN_PROGRESS,
          created: moment().subtract(moment.duration(3, 'm')),
          touched: moment().subtract(moment.duration(10, 's')),
          expires: moment().add(moment.duration(5, 'd')),
          idMapping: {
            'search-hash': {
              id: 'search-id',
              strategy: 'cool',
              status: SearchStatus.IN_PROGRESS,
            },
          },
        },
      } as any;

      mockClient.asyncSearch.status.mockResolvedValue({
        body: {
          is_partial: true,
          is_running: true,
        },
      });

      const updated = await updateSessionStatus(
        {
          savedObjectsClient,
          client: mockClient,
          logger: mockLogger,
        },
        mockConfig,
        so
      );

      expect(updated).toBeFalsy();
      expect(so.attributes.status).toBe(SearchSessionStatus.IN_PROGRESS);
    });

    test("doesn't re-check completed or errored searches", async () => {
      const so = {
        id: '123',
        attributes: {
          expires: moment().add(moment.duration(5, 'd')),
          status: SearchSessionStatus.ERROR,
          idMapping: {
            'search-hash': {
              id: 'search-id',
              strategy: 'cool',
              status: SearchStatus.COMPLETE,
            },
            'another-search-hash': {
              id: 'search-id',
              strategy: 'cool',
              status: SearchStatus.ERROR,
            },
          },
        },
      } as any;

      const updated = await updateSessionStatus(
        {
          savedObjectsClient,
          client: mockClient,
          logger: mockLogger,
        },
        mockConfig,
        so
      );

      expect(updated).toBeFalsy();
      expect(mockClient.asyncSearch.status).not.toBeCalled();
    });

    test('updates to complete if the search is done', async () => {
      savedObjectsClient.bulkUpdate = jest.fn();
      const so = {
        attributes: {
          status: SearchSessionStatus.IN_PROGRESS,
          touched: '123',
          expires: moment().add(moment.duration(5, 'd')),
          idMapping: {
            'search-hash': {
              id: 'search-id',
              strategy: 'cool',
              status: SearchStatus.IN_PROGRESS,
            },
          },
        },
      } as any;
      mockClient.asyncSearch.status.mockResolvedValue({
        body: {
          is_partial: false,
          is_running: false,
          completion_status: 200,
        },
      });

      const updated = await updateSessionStatus(
        {
          savedObjectsClient,
          client: mockClient,
          logger: mockLogger,
        },
        mockConfig,
        so
      );

      expect(updated).toBeTruthy();

      expect(mockClient.asyncSearch.status).toBeCalledWith({ id: 'search-id' }, { meta: true });
      expect(so.attributes.status).toBe(SearchSessionStatus.COMPLETE);
      expect(so.attributes.status).toBe(SearchSessionStatus.COMPLETE);
      expect(so.attributes.touched).not.toBe('123');
      expect(so.attributes.completed).not.toBeUndefined();
      expect(so.attributes.idMapping['search-hash'].status).toBe(SearchStatus.COMPLETE);
      expect(so.attributes.idMapping['search-hash'].error).toBeUndefined();
    });

    test('updates to error if the search is errored', async () => {
      savedObjectsClient.bulkUpdate = jest.fn();
      const so = {
        attributes: {
          expires: moment().add(moment.duration(5, 'd')),
          idMapping: {
            'search-hash': {
              id: 'search-id',
              strategy: 'cool',
              status: SearchStatus.IN_PROGRESS,
            },
          },
        },
      } as any;

      mockClient.asyncSearch.status.mockResolvedValue({
        body: {
          is_partial: false,
          is_running: false,
          completion_status: 500,
        },
      });

      const updated = await updateSessionStatus(
        {
          savedObjectsClient,
          client: mockClient,
          logger: mockLogger,
        },
        mockConfig,
        so
      );

      expect(updated).toBeTruthy();
      expect(so.attributes.status).toBe(SearchSessionStatus.ERROR);
      expect(so.attributes.touched).not.toBe('123');
      expect(so.attributes.idMapping['search-hash'].status).toBe(SearchStatus.ERROR);
      expect(so.attributes.idMapping['search-hash'].error).toBe(
        'Search completed with a 500 status'
      );
    });
  });

  describe('bulkUpdateSessions', () => {
    test('does nothing if there are no open sessions', async () => {
      await bulkUpdateSessions(
        {
          savedObjectsClient,
          client: mockClient,
          logger: mockLogger,
        },
        []
      );

      expect(savedObjectsClient.bulkUpdate).not.toBeCalled();
      expect(savedObjectsClient.delete).not.toBeCalled();
    });

    test('updates in space', async () => {
      const so = {
        namespaces: ['awesome'],
        attributes: {
          expires: moment().add(moment.duration(5, 'd')),
          status: SearchSessionStatus.IN_PROGRESS,
          touched: '123',
          idMapping: {
            'search-hash': {
              id: 'search-id',
              strategy: 'cool',
              status: SearchStatus.IN_PROGRESS,
            },
          },
        },
      } as any;

      savedObjectsClient.bulkUpdate = jest.fn().mockResolvedValue({
        saved_objects: [so],
      });

      await bulkUpdateSessions(
        {
          savedObjectsClient,
          client: mockClient,
          logger: mockLogger,
        },
        [so]
      );

      const [updateInput] = savedObjectsClient.bulkUpdate.mock.calls[0];
      const updatedAttributes = updateInput[0] as SavedObjectsBulkUpdateObject;
      expect(updatedAttributes.namespace).toBe('awesome');
    });

    test('logs failures', async () => {
      const so = {
        namespaces: ['awesome'],
        attributes: {
          expires: moment().add(moment.duration(5, 'd')),
          status: SearchSessionStatus.IN_PROGRESS,
          touched: '123',
          idMapping: {
            'search-hash': {
              id: 'search-id',
              strategy: 'cool',
              status: SearchStatus.IN_PROGRESS,
            },
          },
        },
      } as any;

      savedObjectsClient.bulkUpdate = jest.fn().mockResolvedValue({
        saved_objects: [
          {
            error: 'nope',
          },
        ],
      });

      await bulkUpdateSessions(
        {
          savedObjectsClient,
          client: mockClient,
          logger: mockLogger,
        },
        [so]
      );

      expect(savedObjectsClient.bulkUpdate).toBeCalledTimes(1);
      expect(mockLogger.error).toBeCalledTimes(1);
    });
  });
});
