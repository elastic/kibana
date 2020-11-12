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

import type { SavedObject, SavedObjectsClientContract } from 'kibana/server';
import { savedObjectsClientMock } from '../../../../../core/server/mocks';
import { createRequestHash } from '../../../common';
import { BACKGROUND_SESSION_TYPE } from '../../saved_objects';
import { BackgroundSessionService } from './session_service';

describe('BackgroundSessionService', () => {
  let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  let service: BackgroundSessionService;

  const mockSavedObject: SavedObject = {
    id: 'd7170a35-7e2c-48d6-8dec-9a056721b489',
    type: BACKGROUND_SESSION_TYPE,
    attributes: {
      name: 'my_name',
      url: 'my_url',
      idMapping: {},
    },
    references: [],
  };

  beforeEach(() => {
    savedObjectsClient = savedObjectsClientMock.create();
    service = new BackgroundSessionService();
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
      const url = '/path/to/restored/session';
      const expires = new Date();

      await service.trackId(
        searchRequest,
        searchId,
        { sessionId, isStored },
        { savedObjectsClient }
      );

      expect(savedObjectsClient.update).not.toHaveBeenCalled();

      await service.save(sessionId, name, url, expires, { savedObjectsClient });

      expect(savedObjectsClient.create).toHaveBeenCalledWith(
        BACKGROUND_SESSION_TYPE,
        {
          name,
          url,
          expires: expires.toISOString(),
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
          url: 'my_url',
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
});
