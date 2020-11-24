/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { coreMock } from 'src/core/server/mocks';
import type { SavedObject, SavedObjectsClientContract } from 'src/core/server';
import { savedObjectsClientMock } from '../../../../../core/server/mocks';
import { BackgroundSessionStatus } from '../../../common';
import { BACKGROUND_SESSION_TYPE } from '../../saved_objects';
import {
  BackgroundSessionService,
  INMEM_TRACKING_INTERVAL,
  MAX_UPDATE_RETRIES,
  SessionInfo,
} from './session_service';
import { createRequestHash } from './utils';
import moment from 'moment';

describe('BackgroundSessionService', () => {
  let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  let service: BackgroundSessionService;
  const mockCoreStart = coreMock.createStart();

  const MOCK_SESSION_ID = 'session-id-mock';
  const MOCK_ASYNC_ID = '123456';
  const MOCK_KEY_HASH = '608de49a4600dbb5b173492759792e4a';

  const createMockInternalSavedObjectClient = (
    bulkGetSpy?: jest.SpyInstance<any>,
    bulkUpdateSpy?: jest.SpyInstance<any>
  ) => {
    Object.defineProperty(service, 'internalSavedObjectsClient', {
      get: () => {
        const bulkGet =
          bulkGetSpy ||
          (() => {
            return {
              saved_objects: [
                {
                  attributes: {
                    sessionId: MOCK_SESSION_ID,
                    idMapping: {
                      'another-key': 'another-async-id',
                    },
                  },
                  id: MOCK_SESSION_ID,
                  version: '1',
                },
              ],
            };
          });

        const bulkUpdate =
          bulkUpdateSpy ||
          (() => {
            return {
              saved_objects: [],
            };
          });
        return {
          bulkGet,
          bulkUpdate,
        };
      },
    });
  };

  const createMockIdMapping = (
    mapValues: any[],
    insertTime?: moment.Moment,
    retryCount?: number
  ): Map<string, SessionInfo> => {
    const fakeMap = new Map();
    fakeMap.set(MOCK_SESSION_ID, {
      ids: new Map(mapValues),
      insertTime: insertTime || moment(),
      retryCount: retryCount || 0,
    });
    return fakeMap;
  };

  const mockSavedObject: SavedObject = {
    id: 'd7170a35-7e2c-48d6-8dec-9a056721b489',
    type: BACKGROUND_SESSION_TYPE,
    attributes: {
      name: 'my_name',
      idMapping: {},
    },
    references: [],
  };

  beforeEach(() => {
    savedObjectsClient = savedObjectsClientMock.create();
    const mockLogger: any = {
      debug: jest.fn(),
      error: jest.fn(),
    };
    service = new BackgroundSessionService(mockLogger);
  });

  it('save throws if `name` is not provided', () => {
    const sessionId = 'd7170a35-7e2c-48d6-8dec-9a056721b489';

    expect(() => service.save(sessionId, {}, { savedObjectsClient })).rejects.toMatchInlineSnapshot(
      `[Error: Name is required]`
    );
  });

  it('get calls saved objects client', async () => {
    savedObjectsClient.get.mockResolvedValue(mockSavedObject);

    const sessionId = 'd7170a35-7e2c-48d6-8dec-9a056721b489';
    const response = await service.get(sessionId, { savedObjectsClient });

    expect(response).toBe(mockSavedObject);
    expect(savedObjectsClient.get).toHaveBeenCalledWith(BACKGROUND_SESSION_TYPE, sessionId);
  });

  it('find calls saved objects client', async () => {
    const mockFindSavedObject = {
      ...mockSavedObject,
      score: 1,
    };
    const mockResponse = {
      saved_objects: [mockFindSavedObject],
      total: 1,
      per_page: 1,
      page: 0,
    };
    savedObjectsClient.find.mockResolvedValue(mockResponse);

    const options = { page: 0, perPage: 5 };
    const response = await service.find(options, { savedObjectsClient });

    expect(response).toBe(mockResponse);
    expect(savedObjectsClient.find).toHaveBeenCalledWith({
      ...options,
      type: BACKGROUND_SESSION_TYPE,
    });
  });

  it('update calls saved objects client', async () => {
    const mockUpdateSavedObject = {
      ...mockSavedObject,
      attributes: {},
    };
    savedObjectsClient.update.mockResolvedValue(mockUpdateSavedObject);

    const sessionId = 'd7170a35-7e2c-48d6-8dec-9a056721b489';
    const attributes = { name: 'new_name' };
    const response = await service.update(sessionId, attributes, { savedObjectsClient });

    expect(response).toBe(mockUpdateSavedObject);
    expect(savedObjectsClient.update).toHaveBeenCalledWith(
      BACKGROUND_SESSION_TYPE,
      sessionId,
      attributes
    );
  });

  it('delete calls saved objects client', async () => {
    savedObjectsClient.delete.mockResolvedValue({});

    const sessionId = 'd7170a35-7e2c-48d6-8dec-9a056721b489';
    const response = await service.delete(sessionId, { savedObjectsClient });

    expect(response).toEqual({});
    expect(savedObjectsClient.delete).toHaveBeenCalledWith(BACKGROUND_SESSION_TYPE, sessionId);
  });

  describe('trackId', () => {
    it('stores hash in memory when `isStored` is `false` for when `save` is called', async () => {
      const searchRequest = { params: {} };
      const requestHash = createRequestHash(searchRequest.params);
      const searchId = 'FnpFYlBpeXdCUTMyZXhCLTc1TWFKX0EbdDFDTzJzTE1Sck9PVTBIcW1iU05CZzo4MDA0';
      const sessionId = 'd7170a35-7e2c-48d6-8dec-9a056721b489';
      const isStored = false;
      const name = 'my saved background search session';
      const created = new Date().toISOString();
      const expires = new Date().toISOString();

      await service.trackId(
        searchRequest,
        searchId,
        { sessionId, isStored },
        { savedObjectsClient }
      );

      expect(savedObjectsClient.update).not.toHaveBeenCalled();

      await service.save(sessionId, { name, created, expires }, { savedObjectsClient });

      expect(savedObjectsClient.create).toHaveBeenCalledWith(
        BACKGROUND_SESSION_TYPE,
        {
          name,
          created,
          expires,
          initialState: {},
          restoreState: {},
          status: BackgroundSessionStatus.IN_PROGRESS,
          idMapping: { [requestHash]: searchId },
        },
        { id: sessionId }
      );
    });

    it('updates saved object when `isStored` is `true`', async () => {
      const searchRequest = { params: {} };
      const requestHash = createRequestHash(searchRequest.params);
      const searchId = 'FnpFYlBpeXdCUTMyZXhCLTc1TWFKX0EbdDFDTzJzTE1Sck9PVTBIcW1iU05CZzo4MDA0';
      const sessionId = 'd7170a35-7e2c-48d6-8dec-9a056721b489';
      const isStored = true;

      await service.trackId(
        searchRequest,
        searchId,
        { sessionId, isStored },
        { savedObjectsClient }
      );

      expect(savedObjectsClient.update).toHaveBeenCalledWith(BACKGROUND_SESSION_TYPE, sessionId, {
        idMapping: { [requestHash]: searchId },
      });
    });
  });

  describe('getId', () => {
    it('throws if `sessionId` is not provided', () => {
      const searchRequest = { params: {} };

      expect(() =>
        service.getId(searchRequest, {}, { savedObjectsClient })
      ).rejects.toMatchInlineSnapshot(`[Error: Session ID is required]`);
    });

    it('throws if there is not a saved object', () => {
      const searchRequest = { params: {} };
      const sessionId = 'd7170a35-7e2c-48d6-8dec-9a056721b489';

      expect(() =>
        service.getId(searchRequest, { sessionId, isStored: false }, { savedObjectsClient })
      ).rejects.toMatchInlineSnapshot(
        `[Error: Cannot get search ID from a session that is not stored]`
      );
    });

    it('throws if not restoring a saved session', () => {
      const searchRequest = { params: {} };
      const sessionId = 'd7170a35-7e2c-48d6-8dec-9a056721b489';

      expect(() =>
        service.getId(
          searchRequest,
          { sessionId, isStored: true, isRestore: false },
          { savedObjectsClient }
        )
      ).rejects.toMatchInlineSnapshot(
        `[Error: Get search ID is only supported when restoring a session]`
      );
    });

    it('returns the search ID from the saved object ID mapping', async () => {
      const searchRequest = { params: {} };
      const requestHash = createRequestHash(searchRequest.params);
      const searchId = 'FnpFYlBpeXdCUTMyZXhCLTc1TWFKX0EbdDFDTzJzTE1Sck9PVTBIcW1iU05CZzo4MDA0';
      const sessionId = 'd7170a35-7e2c-48d6-8dec-9a056721b489';
      const mockSession = {
        id: 'd7170a35-7e2c-48d6-8dec-9a056721b489',
        type: BACKGROUND_SESSION_TYPE,
        attributes: {
          name: 'my_name',
          idMapping: { [requestHash]: searchId },
        },
        references: [],
      };
      savedObjectsClient.get.mockResolvedValue(mockSession);

      const id = await service.getId(
        searchRequest,
        { sessionId, isStored: true, isRestore: true },
        { savedObjectsClient }
      );

      expect(id).toBe(searchId);
    });
  });

  describe('Monitor', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      service.start(mockCoreStart);
    });

    afterEach(() => {
      jest.useRealTimers();
      service.stop();
    });

    it('should delete expired IDs', async () => {
      const bulkGetSpy = jest.fn().mockResolvedValueOnce({ saved_objects: [] });
      createMockInternalSavedObjectClient(bulkGetSpy);

      const mockIdMapping = createMockIdMapping(
        [[MOCK_KEY_HASH, MOCK_ASYNC_ID]],
        moment().subtract(1, 'm')
      );

      const deleteSpy = jest.spyOn(mockIdMapping, 'delete');
      Object.defineProperty(service, 'sessionSearchMap', {
        get: () => mockIdMapping,
      });

      // Get setInterval to fire
      jest.advanceTimersByTime(INMEM_TRACKING_INTERVAL);

      expect(bulkGetSpy).not.toHaveBeenCalled();
      expect(deleteSpy).toHaveBeenCalledTimes(1);
    });

    it('should delete IDs that passed max retries', async () => {
      const bulkGetSpy = jest.fn().mockResolvedValueOnce({ saved_objects: [] });
      createMockInternalSavedObjectClient(bulkGetSpy);

      const mockIdMapping = createMockIdMapping(
        [[MOCK_KEY_HASH, MOCK_ASYNC_ID]],
        moment().subtract(1, 'm'),
        MAX_UPDATE_RETRIES
      );

      const deleteSpy = jest.spyOn(mockIdMapping, 'delete');
      Object.defineProperty(service, 'sessionSearchMap', {
        get: () => mockIdMapping,
      });

      // Get setInterval to fire
      jest.advanceTimersByTime(INMEM_TRACKING_INTERVAL);

      expect(bulkGetSpy).not.toHaveBeenCalled();
      expect(deleteSpy).toHaveBeenCalledTimes(1);
    });

    it('should bot fetch when no IDs are mapped', async () => {
      const bulkGetSpy = jest.fn().mockResolvedValueOnce({ saved_objects: [] });
      createMockInternalSavedObjectClient(bulkGetSpy);

      jest.advanceTimersByTime(INMEM_TRACKING_INTERVAL);
      expect(bulkGetSpy).not.toHaveBeenCalled();
    });

    it('should try to fetch saved objects if some ids are mapped', async () => {
      const mockIdMapping = createMockIdMapping([[MOCK_KEY_HASH, MOCK_ASYNC_ID]]);
      Object.defineProperty(service, 'sessionSearchMap', {
        get: () => mockIdMapping,
      });

      const bulkGetSpy = jest.fn().mockResolvedValueOnce({ saved_objects: [] });
      const bulkUpdateSpy = jest.fn().mockResolvedValueOnce({ saved_objects: [] });
      createMockInternalSavedObjectClient(bulkGetSpy, bulkUpdateSpy);

      jest.advanceTimersByTime(INMEM_TRACKING_INTERVAL);
      expect(bulkGetSpy).toHaveBeenCalledTimes(1);
      expect(bulkUpdateSpy).not.toHaveBeenCalled();
    });

    it('should update saved objects if they are found, and delete ids on success', async () => {
      const mockIdMapping = createMockIdMapping([[MOCK_KEY_HASH, MOCK_ASYNC_ID]], undefined, 1);
      const mockMapDeleteSpy = jest.fn();
      mockIdMapping.get(MOCK_SESSION_ID)!.ids.delete = mockMapDeleteSpy;
      Object.defineProperty(service, 'sessionSearchMap', {
        get: () => mockIdMapping,
      });

      const bulkGetSpy = jest.fn().mockResolvedValueOnce({
        saved_objects: [
          {
            id: MOCK_SESSION_ID,
            attributes: {
              idMapping: {
                b: 'c',
              },
            },
          },
        ],
      });
      const bulkUpdateSpy = jest.fn().mockResolvedValueOnce({
        saved_objects: [
          {
            id: MOCK_SESSION_ID,
            attributes: {
              idMapping: {
                b: 'c',
                [MOCK_KEY_HASH]: MOCK_ASYNC_ID,
              },
            },
          },
        ],
      });
      createMockInternalSavedObjectClient(bulkGetSpy, bulkUpdateSpy);

      jest.advanceTimersByTime(INMEM_TRACKING_INTERVAL);

      // Release timers to call check after test actions are done.
      jest.useRealTimers();
      await new Promise((r) => setTimeout(r, 15));

      expect(bulkGetSpy).toHaveBeenCalledTimes(1);
      expect(bulkUpdateSpy).toHaveBeenCalledTimes(1);
      expect(mockMapDeleteSpy).toHaveBeenCalledTimes(2);
      expect(mockMapDeleteSpy).toBeCalledWith('b');
      expect(mockMapDeleteSpy).toBeCalledWith(MOCK_KEY_HASH);
      expect(mockIdMapping.get(MOCK_SESSION_ID)?.retryCount).toBe(0);
    });

    it('should update saved objects if they are found, and increase retryCount on error', async () => {
      const mockIdMapping = createMockIdMapping([[MOCK_KEY_HASH, MOCK_ASYNC_ID]]);
      const mockMapDeleteSpy = jest.fn();
      mockIdMapping.get(MOCK_SESSION_ID)!.ids.delete = mockMapDeleteSpy;
      Object.defineProperty(service, 'sessionSearchMap', {
        get: () => mockIdMapping,
      });

      const bulkGetSpy = jest.fn().mockResolvedValueOnce({
        saved_objects: [
          {
            id: MOCK_SESSION_ID,
            attributes: {
              idMapping: {
                b: 'c',
              },
            },
          },
        ],
      });
      const bulkUpdateSpy = jest.fn().mockResolvedValueOnce({
        saved_objects: [
          {
            id: MOCK_SESSION_ID,
            error: 'not ok',
          },
        ],
      });
      createMockInternalSavedObjectClient(bulkGetSpy, bulkUpdateSpy);

      jest.advanceTimersByTime(INMEM_TRACKING_INTERVAL);

      // Release timers to call check after test actions are done.
      jest.useRealTimers();
      await new Promise((r) => setTimeout(r, 15));

      expect(bulkGetSpy).toHaveBeenCalledTimes(1);
      expect(bulkUpdateSpy).toHaveBeenCalledTimes(1);
      expect(mockMapDeleteSpy).not.toHaveBeenCalled();
      expect(mockIdMapping.get(MOCK_SESSION_ID)?.retryCount).toBe(1);
    });
  });
});
