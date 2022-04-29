/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { checkNonPersistedSessions as checkNonPersistedSessions$ } from './check_non_persisted_sessions';
import {
  SearchSessionStatus,
  SearchSessionSavedObjectAttributes,
  ENHANCED_ES_SEARCH_STRATEGY,
  EQL_SEARCH_STRATEGY,
} from '../../../common';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { CheckSearchSessionsDeps, SearchStatus } from './types';
import moment from 'moment';
import {
  SavedObjectsBulkUpdateObject,
  SavedObjectsDeleteOptions,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { SearchSessionsConfigSchema } from '../../../config';

jest.useFakeTimers();

const checkNonPersistedSessions = (
  deps: CheckSearchSessionsDeps,
  config: SearchSessionsConfigSchema
) => checkNonPersistedSessions$(deps, config).toPromise();

describe('checkNonPersistedSessions', () => {
  let mockClient: any;
  let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  const config: SearchSessionsConfigSchema = {
    enabled: true,
    pageSize: 5,
    notTouchedInProgressTimeout: moment.duration(1, 'm'),
    notTouchedTimeout: moment.duration(5, 'm'),
    maxUpdateRetries: 3,
    defaultExpiration: moment.duration(7, 'd'),
    trackingInterval: moment.duration(10, 's'),
    expireInterval: moment.duration(10, 'm'),
    monitoringTaskTimeout: moment.duration(5, 'm'),
    cleanupInterval: moment.duration(10, 's'),
    management: {} as any,
  };
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

  test('does nothing if there are no open sessions', async () => {
    savedObjectsClient.find.mockResolvedValue({
      saved_objects: [],
      total: 0,
    } as any);

    await checkNonPersistedSessions(
      {
        savedObjectsClient,
        client: mockClient,
        logger: mockLogger,
      },
      config
    );

    expect(savedObjectsClient.bulkUpdate).not.toBeCalled();
    expect(savedObjectsClient.delete).not.toBeCalled();
  });

  describe('delete', () => {
    test('doesnt delete a non persisted, recently touched session', async () => {
      savedObjectsClient.find.mockResolvedValue({
        saved_objects: [
          {
            id: '123',
            attributes: {
              persisted: false,
              status: SearchSessionStatus.IN_PROGRESS,
              expires: moment().add(moment.duration(3, 'm')),
              created: moment().subtract(moment.duration(3, 'm')),
              touched: moment().subtract(moment.duration(10, 's')),
              idMapping: {},
            },
          },
        ],
        total: 1,
      } as any);
      await checkNonPersistedSessions(
        {
          savedObjectsClient,
          client: mockClient,
          logger: mockLogger,
        },
        config
      );

      expect(savedObjectsClient.bulkUpdate).not.toBeCalled();
      expect(savedObjectsClient.delete).not.toBeCalled();
    });

    test('doesnt delete a non persisted, completed session, within on screen time frame', async () => {
      savedObjectsClient.find.mockResolvedValue({
        saved_objects: [
          {
            id: '123',
            attributes: {
              persisted: false,
              status: SearchSessionStatus.COMPLETE,
              created: moment().subtract(moment.duration(3, 'm')),
              touched: moment().subtract(moment.duration(1, 'm')),
              expires: moment().add(moment.duration(3, 'm')),
              idMapping: {
                'search-hash': {
                  id: 'search-id',
                  strategy: 'cool',
                  status: SearchStatus.COMPLETE,
                },
              },
            },
          },
        ],
        total: 1,
      } as any);
      await checkNonPersistedSessions(
        {
          savedObjectsClient,
          client: mockClient,
          logger: mockLogger,
        },
        config
      );

      expect(savedObjectsClient.bulkUpdate).not.toBeCalled();
      expect(savedObjectsClient.delete).not.toBeCalled();
    });

    test('deletes in space', async () => {
      savedObjectsClient.find.mockResolvedValue({
        saved_objects: [
          {
            id: '123',
            namespaces: ['awesome'],
            attributes: {
              persisted: false,
              status: SearchSessionStatus.IN_PROGRESS,
              expires: moment().add(moment.duration(3, 'm')),
              created: moment().subtract(moment.duration(3, 'm')),
              touched: moment().subtract(moment.duration(2, 'm')),
              idMapping: {
                'map-key': {
                  strategy: ENHANCED_ES_SEARCH_STRATEGY,
                  id: 'async-id',
                },
              },
            },
          },
        ],
        total: 1,
      } as any);

      await checkNonPersistedSessions(
        {
          savedObjectsClient,
          client: mockClient,
          logger: mockLogger,
        },
        config
      );

      expect(savedObjectsClient.delete).toBeCalled();

      const [, id, opts] = savedObjectsClient.delete.mock.calls[0];
      expect(id).toBe('123');
      expect((opts as SavedObjectsDeleteOptions).namespace).toBe('awesome');
    });

    test('deletes a non persisted, abandoned session', async () => {
      savedObjectsClient.find.mockResolvedValue({
        saved_objects: [
          {
            id: '123',
            attributes: {
              persisted: false,
              status: SearchSessionStatus.IN_PROGRESS,
              created: moment().subtract(moment.duration(3, 'm')),
              touched: moment().subtract(moment.duration(2, 'm')),
              expires: moment().add(moment.duration(3, 'm')),
              idMapping: {
                'map-key': {
                  strategy: ENHANCED_ES_SEARCH_STRATEGY,
                  id: 'async-id',
                },
              },
            },
          },
        ],
        total: 1,
      } as any);

      await checkNonPersistedSessions(
        {
          savedObjectsClient,
          client: mockClient,
          logger: mockLogger,
        },
        config
      );

      expect(savedObjectsClient.bulkUpdate).not.toBeCalled();
      expect(savedObjectsClient.delete).toBeCalled();

      expect(mockClient.asyncSearch.delete).toBeCalled();

      const { id } = mockClient.asyncSearch.delete.mock.calls[0][0];
      expect(id).toBe('async-id');
    });

    test('deletes a completed, not persisted session', async () => {
      mockClient.asyncSearch.delete = jest.fn().mockResolvedValue(true);

      savedObjectsClient.find.mockResolvedValue({
        saved_objects: [
          {
            id: '123',
            attributes: {
              persisted: false,
              status: SearchSessionStatus.COMPLETE,
              expires: moment().add(moment.duration(3, 'm')),
              created: moment().subtract(moment.duration(30, 'm')),
              touched: moment().subtract(moment.duration(6, 'm')),
              idMapping: {
                'map-key': {
                  strategy: ENHANCED_ES_SEARCH_STRATEGY,
                  id: 'async-id',
                  status: SearchStatus.COMPLETE,
                },
                'eql-map-key': {
                  strategy: EQL_SEARCH_STRATEGY,
                  id: 'eql-async-id',
                  status: SearchStatus.COMPLETE,
                },
              },
            },
          },
        ],
        total: 1,
      } as any);

      await checkNonPersistedSessions(
        {
          savedObjectsClient,
          client: mockClient,
          logger: mockLogger,
        },
        config
      );

      expect(savedObjectsClient.bulkUpdate).not.toBeCalled();
      expect(savedObjectsClient.delete).toBeCalled();

      expect(mockClient.asyncSearch.delete).toBeCalled();
      expect(mockClient.eql.delete).not.toBeCalled();

      const { id } = mockClient.asyncSearch.delete.mock.calls[0][0];
      expect(id).toBe('async-id');
    });

    test('ignores errors thrown while deleting async searches', async () => {
      mockClient.asyncSearch.delete = jest.fn().mockRejectedValueOnce(false);

      savedObjectsClient.find.mockResolvedValue({
        saved_objects: [
          {
            id: '123',
            attributes: {
              persisted: false,
              status: SearchSessionStatus.COMPLETE,
              expires: moment().add(moment.duration(3, 'm')),
              created: moment().subtract(moment.duration(30, 'm')),
              touched: moment().subtract(moment.duration(6, 'm')),
              idMapping: {
                'map-key': {
                  strategy: ENHANCED_ES_SEARCH_STRATEGY,
                  id: 'async-id',
                  status: SearchStatus.COMPLETE,
                },
              },
            },
          },
        ],
        total: 1,
      } as any);

      await checkNonPersistedSessions(
        {
          savedObjectsClient,
          client: mockClient,
          logger: mockLogger,
        },
        config
      );

      expect(savedObjectsClient.bulkUpdate).not.toBeCalled();
      expect(savedObjectsClient.delete).toBeCalled();

      expect(mockClient.asyncSearch.delete).toBeCalled();

      const { id } = mockClient.asyncSearch.delete.mock.calls[0][0];
      expect(id).toBe('async-id');
    });

    test("doesn't attempt to delete errored out async search", async () => {
      mockClient.asyncSearch.delete = jest.fn();

      savedObjectsClient.find.mockResolvedValue({
        saved_objects: [
          {
            id: '123',
            attributes: {
              persisted: false,
              status: SearchSessionStatus.ERROR,
              expires: moment().add(moment.duration(3, 'm')),
              created: moment().subtract(moment.duration(30, 'm')),
              touched: moment().subtract(moment.duration(6, 'm')),
              idMapping: {
                'map-key': {
                  strategy: ENHANCED_ES_SEARCH_STRATEGY,
                  id: 'async-id',
                  status: SearchStatus.ERROR,
                },
              },
            },
          },
        ],
        total: 1,
      } as any);

      await checkNonPersistedSessions(
        {
          savedObjectsClient,
          client: mockClient,
          logger: mockLogger,
        },
        config
      );

      expect(savedObjectsClient.bulkUpdate).not.toBeCalled();
      expect(savedObjectsClient.delete).toBeCalled();
      expect(mockClient.asyncSearch.delete).not.toBeCalled();
    });
  });

  describe('update', () => {
    test('does nothing if the search is still running', async () => {
      const so = {
        id: '123',
        attributes: {
          persisted: false,
          status: SearchSessionStatus.IN_PROGRESS,
          created: moment().subtract(moment.duration(3, 'm')),
          touched: moment().subtract(moment.duration(10, 's')),
          expires: moment().add(moment.duration(3, 'm')),
          idMapping: {
            'search-hash': {
              id: 'search-id',
              strategy: 'cool',
              status: SearchStatus.IN_PROGRESS,
            },
          },
        },
      };
      savedObjectsClient.find.mockResolvedValue({
        saved_objects: [so],
        total: 1,
      } as any);

      mockClient.asyncSearch.status.mockResolvedValue({
        body: {
          is_partial: true,
          is_running: true,
        },
      });

      await checkNonPersistedSessions(
        {
          savedObjectsClient,
          client: mockClient,
          logger: mockLogger,
        },
        config
      );

      expect(savedObjectsClient.bulkUpdate).not.toBeCalled();
      expect(savedObjectsClient.delete).not.toBeCalled();
    });

    test("doesn't re-check completed or errored searches", async () => {
      savedObjectsClient.bulkUpdate = jest.fn();
      savedObjectsClient.delete = jest.fn();
      const so = {
        id: '123',
        attributes: {
          status: SearchSessionStatus.ERROR,
          expires: moment().add(moment.duration(3, 'm')),
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
      };
      savedObjectsClient.find.mockResolvedValue({
        saved_objects: [so],
        total: 1,
      } as any);

      await checkNonPersistedSessions(
        {
          savedObjectsClient,
          client: mockClient,
          logger: mockLogger,
        },
        config
      );

      expect(mockClient.asyncSearch.status).not.toBeCalled();
      expect(savedObjectsClient.bulkUpdate).not.toBeCalled();
      expect(savedObjectsClient.delete).not.toBeCalled();
    });

    test('updates in space', async () => {
      savedObjectsClient.bulkUpdate = jest.fn();
      const so = {
        namespaces: ['awesome'],
        attributes: {
          status: SearchSessionStatus.IN_PROGRESS,
          expires: moment().add(moment.duration(3, 'm')),
          touched: '123',
          idMapping: {
            'search-hash': {
              id: 'search-id',
              strategy: 'cool',
              status: SearchStatus.IN_PROGRESS,
            },
          },
        },
      };
      savedObjectsClient.find.mockResolvedValue({
        saved_objects: [so],
        total: 1,
      } as any);

      mockClient.asyncSearch.status.mockResolvedValue({
        body: {
          is_partial: false,
          is_running: false,
          completion_status: 200,
        },
      });

      await checkNonPersistedSessions(
        {
          savedObjectsClient,
          client: mockClient,
          logger: mockLogger,
        },
        config
      );

      expect(mockClient.asyncSearch.status).toBeCalledWith({ id: 'search-id' }, { meta: true });
      const [updateInput] = savedObjectsClient.bulkUpdate.mock.calls[0];
      const updatedAttributes = updateInput[0] as SavedObjectsBulkUpdateObject;
      expect(updatedAttributes.namespace).toBe('awesome');
    });

    test('updates to complete if the search is done', async () => {
      savedObjectsClient.bulkUpdate = jest.fn();
      const so = {
        attributes: {
          status: SearchSessionStatus.IN_PROGRESS,
          expires: moment().add(moment.duration(3, 'm')),
          touched: '123',
          idMapping: {
            'search-hash': {
              id: 'search-id',
              strategy: 'cool',
              status: SearchStatus.IN_PROGRESS,
            },
          },
        },
      };
      savedObjectsClient.find.mockResolvedValue({
        saved_objects: [so],
        total: 1,
      } as any);

      mockClient.asyncSearch.status.mockResolvedValue({
        body: {
          is_partial: false,
          is_running: false,
          completion_status: 200,
        },
      });

      await checkNonPersistedSessions(
        {
          savedObjectsClient,
          client: mockClient,
          logger: mockLogger,
        },
        config
      );

      expect(mockClient.asyncSearch.status).toBeCalledWith({ id: 'search-id' }, { meta: true });
      const [updateInput] = savedObjectsClient.bulkUpdate.mock.calls[0];
      const updatedAttributes = updateInput[0].attributes as SearchSessionSavedObjectAttributes;
      expect(updatedAttributes.status).toBe(SearchSessionStatus.COMPLETE);
      expect(updatedAttributes.touched).not.toBe('123');
      expect(updatedAttributes.completed).not.toBeUndefined();
      expect(updatedAttributes.idMapping['search-hash'].status).toBe(SearchStatus.COMPLETE);
      expect(updatedAttributes.idMapping['search-hash'].error).toBeUndefined();

      expect(savedObjectsClient.delete).not.toBeCalled();
    });

    test('updates to error if the search is errored', async () => {
      savedObjectsClient.bulkUpdate = jest.fn();
      const so = {
        attributes: {
          expires: moment().add(moment.duration(3, 'm')),
          idMapping: {
            'search-hash': {
              id: 'search-id',
              strategy: 'cool',
              status: SearchStatus.IN_PROGRESS,
            },
          },
        },
      };
      savedObjectsClient.find.mockResolvedValue({
        saved_objects: [so],
        total: 1,
      } as any);

      mockClient.asyncSearch.status.mockResolvedValue({
        body: {
          is_partial: false,
          is_running: false,
          completion_status: 500,
        },
      });

      await checkNonPersistedSessions(
        {
          savedObjectsClient,
          client: mockClient,
          logger: mockLogger,
        },
        config
      );
      const [updateInput] = savedObjectsClient.bulkUpdate.mock.calls[0];
      const updatedAttributes = updateInput[0].attributes as SearchSessionSavedObjectAttributes;
      expect(updatedAttributes.status).toBe(SearchSessionStatus.ERROR);
      expect(updatedAttributes.idMapping['search-hash'].status).toBe(SearchStatus.ERROR);
      expect(updatedAttributes.idMapping['search-hash'].error).toBe(
        'Search completed with a 500 status'
      );
    });
  });
});
