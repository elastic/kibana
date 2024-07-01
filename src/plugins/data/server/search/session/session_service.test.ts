/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  SavedObject,
  SavedObjectsClientContract,
  SavedObjectsErrorHelpers,
} from '@kbn/core/server';
import { ElasticsearchClientMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { nodeBuilder } from '@kbn/es-query';
import { SearchSessionService } from './session_service';
import { createRequestHash } from './utils';
import moment from 'moment';
import { coreMock } from '@kbn/core/server/mocks';
import { ConfigSchema } from '../../../config';
import type { AuthenticatedUser } from '@kbn/core/server';
import { SEARCH_SESSION_TYPE, SearchSessionStatus } from '../../../common';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';

const MAX_UPDATE_RETRIES = 3;

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe('SearchSessionService', () => {
  let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  let elasticsearchClient: ElasticsearchClientMock;
  let service: SearchSessionService;

  const MOCK_STRATEGY = 'ese';

  const sessionId = 'd7170a35-7e2c-48d6-8dec-9a056721b489';
  const mockUser1 = {
    username: 'my_username',
    authentication_realm: {
      type: 'my_realm_type',
      name: 'my_realm_name',
    },
  } as AuthenticatedUser;
  const mockUser2 = {
    username: 'bar',
    authentication_realm: {
      type: 'bar',
      name: 'bar',
    },
  } as AuthenticatedUser;
  const mockSavedObject: SavedObject<any> = {
    id: 'd7170a35-7e2c-48d6-8dec-9a056721b489',
    type: SEARCH_SESSION_TYPE,
    attributes: {
      name: 'my_name',
      appId: 'my_app_id',
      locatorId: 'my_locator_id',
      idMapping: {},
      realmType: mockUser1.authentication_realm.type,
      realmName: mockUser1.authentication_realm.name,
      username: mockUser1.username,
    },
    references: [],
  };

  describe('Feature disabled', () => {
    beforeEach(async () => {
      savedObjectsClient = savedObjectsClientMock.create();
      elasticsearchClient = elasticsearchServiceMock.createElasticsearchClient();
      const config: ConfigSchema = {
        search: {
          sessions: {
            enabled: false,
            notTouchedTimeout: moment.duration(2, 'm'),
            maxUpdateRetries: MAX_UPDATE_RETRIES,
            defaultExpiration: moment.duration(7, 'd'),
            management: {} as any,
          },
        },
      } as unknown as ConfigSchema;
      const mockLogger: any = {
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };
      service = new SearchSessionService(mockLogger, config, '8.0.0');
      service.setup(coreMock.createSetup(), {});
      await flushPromises();
    });

    afterEach(() => {
      service.stop();
    });

    it('trackId ignores', async () => {
      await service.trackId({ savedObjectsClient }, mockUser1, { params: {} }, '123', {
        sessionId: '321',
        strategy: MOCK_STRATEGY,
      });

      expect(savedObjectsClient.update).not.toHaveBeenCalled();
      expect(savedObjectsClient.create).not.toHaveBeenCalled();
    });

    it('Save throws', async () => {
      await expect(() =>
        service.save({ savedObjectsClient }, mockUser1, sessionId, {})
      ).rejects.toBeInstanceOf(Error);
    });

    it('Update throws', async () => {
      const attributes = { name: 'new_name' };
      const response = service.update({ savedObjectsClient }, mockUser1, sessionId, attributes);
      await expect(response).rejects.toBeInstanceOf(Error);
    });

    it('Cancel throws', async () => {
      const response = service.cancel({ savedObjectsClient }, mockUser1, sessionId);
      await expect(response).rejects.toBeInstanceOf(Error);
    });

    it('getId throws', async () => {
      const response = service.getId({ savedObjectsClient }, mockUser1, {}, {});
      await expect(response).rejects.toBeInstanceOf(Error);
    });

    it('Delete throws', async () => {
      const response = service.delete({ savedObjectsClient }, mockUser1, sessionId);
      await expect(response).rejects.toBeInstanceOf(Error);
    });
  });

  describe('Feature enabled', () => {
    beforeEach(async () => {
      savedObjectsClient = savedObjectsClientMock.create();
      elasticsearchClient = elasticsearchServiceMock.createElasticsearchClient();
      const config: ConfigSchema = {
        search: {
          sessions: {
            enabled: true,
            pageSize: 10000,
            notTouchedTimeout: moment.duration(2, 'm'),
            maxUpdateRetries: MAX_UPDATE_RETRIES,
            defaultExpiration: moment.duration(7, 'd'),
            management: {} as any,
          },
        },
      } as unknown as ConfigSchema;
      const mockLogger: any = {
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };
      service = new SearchSessionService(mockLogger, config, '8.0.0');
      service.setup(coreMock.createSetup(), {});
      const coreStart = coreMock.createStart();

      await flushPromises();
      service.start(coreStart, {});
    });

    afterEach(() => {
      service.stop();
    });

    describe('save', () => {
      it('throws if `name` is not provided', async () => {
        await expect(() =>
          service.save({ savedObjectsClient }, mockUser1, sessionId, {})
        ).rejects.toMatchInlineSnapshot(`[Error: Name is required]`);
      });

      it('throws if `appId` is not provided', async () => {
        await expect(
          service.save({ savedObjectsClient }, mockUser1, sessionId, {
            name: 'banana',
          })
        ).rejects.toMatchInlineSnapshot(`[Error: AppId is required]`);
      });

      it('throws if `locatorId` is not provided', async () => {
        await expect(
          service.save({ savedObjectsClient }, mockUser1, sessionId, {
            name: 'banana',
            appId: 'nanana',
          })
        ).rejects.toMatchInlineSnapshot(`[Error: locatorId is required]`);
      });

      it('saving creates a new persisted saved object', async () => {
        const mockCreatedSavedObject = {
          ...mockSavedObject,
          attributes: {},
        };

        savedObjectsClient.create.mockResolvedValue(mockCreatedSavedObject);

        await service.save({ savedObjectsClient }, mockUser1, sessionId, {
          name: 'banana',
          appId: 'nanana',
          locatorId: 'panama',
        });

        expect(savedObjectsClient.update).toHaveBeenCalledTimes(0);
        expect(savedObjectsClient.create).toHaveBeenCalledTimes(1);

        const [type, callAttributes, options] = savedObjectsClient.create.mock.calls[0];
        expect(type).toBe(SEARCH_SESSION_TYPE);
        expect(options?.id).toBe(sessionId);
        expect(callAttributes).toHaveProperty('idMapping', {});
        expect(callAttributes).toHaveProperty('expires');
        expect(callAttributes).toHaveProperty('created');
        expect(callAttributes).toHaveProperty('name', 'banana');
        expect(callAttributes).toHaveProperty('appId', 'nanana');
        expect(callAttributes).toHaveProperty('locatorId', 'panama');
        expect(callAttributes).toHaveProperty('initialState', {});
        expect(callAttributes).toHaveProperty('restoreState', {});
        expect(callAttributes).toHaveProperty('realmType', mockUser1.authentication_realm.type);
        expect(callAttributes).toHaveProperty('realmName', mockUser1.authentication_realm.name);
        expect(callAttributes).toHaveProperty('username', mockUser1.username);
      });

      it('throws error if user conflicts', async () => {
        savedObjectsClient.get.mockResolvedValue(mockSavedObject);

        await expect(
          service.get({ savedObjectsClient }, mockUser2, sessionId)
        ).rejects.toMatchInlineSnapshot(`[Error: Not Found]`);
      });

      it('works without security', async () => {
        savedObjectsClient.update.mockRejectedValue(
          SavedObjectsErrorHelpers.createGenericNotFoundError(sessionId)
        );

        await service.save(
          { savedObjectsClient },

          null,
          sessionId,
          {
            name: 'my_name',
            appId: 'my_app_id',
            locatorId: 'my_locator_id',
          }
        );

        expect(savedObjectsClient.create).toHaveBeenCalled();
        const [[, attributes]] = savedObjectsClient.create.mock.calls;
        expect(attributes).toHaveProperty('realmType', undefined);
        expect(attributes).toHaveProperty('realmName', undefined);
        expect(attributes).toHaveProperty('username', undefined);
      });
    });

    describe('get', () => {
      it('calls saved objects client', async () => {
        savedObjectsClient.get.mockResolvedValue(mockSavedObject);

        const response = await service.get({ savedObjectsClient }, mockUser1, sessionId);

        expect(response).toBe(mockSavedObject);
        expect(savedObjectsClient.get).toHaveBeenCalledWith(SEARCH_SESSION_TYPE, sessionId);
      });

      it('works without security', async () => {
        savedObjectsClient.get.mockResolvedValue(mockSavedObject);

        const response = await service.get({ savedObjectsClient }, null, sessionId);

        expect(response).toBe(mockSavedObject);
        expect(savedObjectsClient.get).toHaveBeenCalledWith(SEARCH_SESSION_TYPE, sessionId);
      });
    });

    describe('find', () => {
      it('calls saved objects client with user filter', async () => {
        const mockFindSavedObject = {
          ...mockSavedObject,
          score: 1,
        };
        const mockResponse = {
          saved_objects: [mockFindSavedObject],
          total: 1,
          per_page: 1,
          page: 0,
          statuses: {
            [mockSavedObject.id]: { status: SearchSessionStatus.IN_PROGRESS },
          },
        };
        savedObjectsClient.find.mockResolvedValue(mockResponse);

        const options = { page: 0, perPage: 5 };
        const response = await service.find(
          { savedObjectsClient, internalElasticsearchClient: elasticsearchClient },
          mockUser1,
          options
        );

        expect(response).toEqual(mockResponse);
        const [[findOptions]] = savedObjectsClient.find.mock.calls;
        expect(findOptions).toMatchInlineSnapshot(`
          Object {
            "filter": Object {
              "arguments": Array [
                Object {
                  "arguments": Array [
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "search-session.attributes.realmType",
                    },
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "my_realm_type",
                    },
                  ],
                  "function": "is",
                  "type": "function",
                },
                Object {
                  "arguments": Array [
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "search-session.attributes.realmName",
                    },
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "my_realm_name",
                    },
                  ],
                  "function": "is",
                  "type": "function",
                },
                Object {
                  "arguments": Array [
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "search-session.attributes.username",
                    },
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "my_username",
                    },
                  ],
                  "function": "is",
                  "type": "function",
                },
              ],
              "function": "and",
              "type": "function",
            },
            "page": 0,
            "perPage": 5,
            "type": "search-session",
          }
        `);
      });

      it('mixes in passed-in filter as string and KQL node', async () => {
        const mockFindSavedObject = {
          ...mockSavedObject,
          score: 1,
        };
        const mockResponse = {
          saved_objects: [mockFindSavedObject],
          total: 1,
          per_page: 1,
          page: 0,
          statuses: {
            [mockSavedObject.id]: { status: SearchSessionStatus.IN_PROGRESS },
          },
        };
        savedObjectsClient.find.mockResolvedValue(mockResponse);

        const options1 = { filter: 'foobar' };
        const response1 = await service.find(
          { savedObjectsClient, internalElasticsearchClient: elasticsearchClient },
          mockUser1,
          options1
        );

        const options2 = { filter: nodeBuilder.is('foo', 'bar') };
        const response2 = await service.find(
          { savedObjectsClient, internalElasticsearchClient: elasticsearchClient },
          mockUser1,
          options2
        );

        expect(response1).toEqual(mockResponse);
        expect(response2).toEqual(mockResponse);

        const [[findOptions1], [findOptions2]] = savedObjectsClient.find.mock.calls;
        expect(findOptions1).toMatchInlineSnapshot(`
          Object {
            "filter": Object {
              "arguments": Array [
                Object {
                  "arguments": Array [
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "search-session.attributes.realmType",
                    },
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "my_realm_type",
                    },
                  ],
                  "function": "is",
                  "type": "function",
                },
                Object {
                  "arguments": Array [
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "search-session.attributes.realmName",
                    },
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "my_realm_name",
                    },
                  ],
                  "function": "is",
                  "type": "function",
                },
                Object {
                  "arguments": Array [
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "search-session.attributes.username",
                    },
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "my_username",
                    },
                  ],
                  "function": "is",
                  "type": "function",
                },
                Object {
                  "arguments": Array [
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": null,
                    },
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "foobar",
                    },
                  ],
                  "function": "is",
                  "type": "function",
                },
              ],
              "function": "and",
              "type": "function",
            },
            "type": "search-session",
          }
        `);
        expect(findOptions2).toMatchInlineSnapshot(`
          Object {
            "filter": Object {
              "arguments": Array [
                Object {
                  "arguments": Array [
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "search-session.attributes.realmType",
                    },
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "my_realm_type",
                    },
                  ],
                  "function": "is",
                  "type": "function",
                },
                Object {
                  "arguments": Array [
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "search-session.attributes.realmName",
                    },
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "my_realm_name",
                    },
                  ],
                  "function": "is",
                  "type": "function",
                },
                Object {
                  "arguments": Array [
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "search-session.attributes.username",
                    },
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "my_username",
                    },
                  ],
                  "function": "is",
                  "type": "function",
                },
                Object {
                  "arguments": Array [
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "foo",
                    },
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "bar",
                    },
                  ],
                  "function": "is",
                  "type": "function",
                },
              ],
              "function": "and",
              "type": "function",
            },
            "type": "search-session",
          }
        `);
      });

      it('has no filter without security', async () => {
        const mockFindSavedObject = {
          ...mockSavedObject,
          score: 1,
        };
        const mockResponse = {
          saved_objects: [mockFindSavedObject],
          total: 1,
          per_page: 1,
          page: 0,
          statuses: {
            [mockSavedObject.id]: { status: SearchSessionStatus.IN_PROGRESS },
          },
        };
        savedObjectsClient.find.mockResolvedValue(mockResponse);

        const options = { page: 0, perPage: 5 };
        const response = await service.find(
          { savedObjectsClient, internalElasticsearchClient: elasticsearchClient },
          null,
          options
        );

        expect(response).toEqual(mockResponse);
        const [[findOptions]] = savedObjectsClient.find.mock.calls;
        expect(findOptions).toMatchInlineSnapshot(`
          Object {
            "filter": Object {
              "arguments": Array [],
              "function": "and",
              "type": "function",
            },
            "page": 0,
            "perPage": 5,
            "type": "search-session",
          }
        `);
      });
    });

    describe('update', () => {
      it('update calls saved objects client with added touch time', async () => {
        const mockUpdateSavedObject = {
          ...mockSavedObject,
          attributes: {},
        };
        savedObjectsClient.get.mockResolvedValue(mockSavedObject);
        savedObjectsClient.update.mockResolvedValue(mockUpdateSavedObject);

        const attributes = { name: 'new_name' };
        const response = await service.update(
          { savedObjectsClient },
          mockUser1,
          sessionId,
          attributes
        );

        expect(response).toBe(mockUpdateSavedObject);

        const [type, id, callAttributes] = savedObjectsClient.update.mock.calls[0];

        expect(type).toBe(SEARCH_SESSION_TYPE);
        expect(id).toBe(sessionId);
        expect(callAttributes).toHaveProperty('name', attributes.name);
      });

      it('throws if user conflicts', async () => {
        const mockUpdateSavedObject = {
          ...mockSavedObject,
          attributes: {},
        };
        savedObjectsClient.get.mockResolvedValue(mockSavedObject);
        savedObjectsClient.update.mockResolvedValue(mockUpdateSavedObject);

        const attributes = { name: 'new_name' };
        await expect(
          service.update({ savedObjectsClient }, mockUser2, sessionId, attributes)
        ).rejects.toMatchInlineSnapshot(`[Error: Not Found]`);
      });

      it('works without security', async () => {
        const mockUpdateSavedObject = {
          ...mockSavedObject,
          attributes: {},
        };
        savedObjectsClient.get.mockResolvedValue(mockSavedObject);
        savedObjectsClient.update.mockResolvedValue(mockUpdateSavedObject);

        const attributes = { name: 'new_name' };
        const response = await service.update({ savedObjectsClient }, null, sessionId, attributes);
        const [type, id, callAttributes] = savedObjectsClient.update.mock.calls[0];

        expect(response).toBe(mockUpdateSavedObject);
        expect(type).toBe(SEARCH_SESSION_TYPE);
        expect(id).toBe(sessionId);
        expect(callAttributes).toHaveProperty('name', 'new_name');
      });
    });

    describe('cancel', () => {
      it('updates object status', async () => {
        savedObjectsClient.get.mockResolvedValue(mockSavedObject);

        await service.cancel({ savedObjectsClient }, mockUser1, sessionId);
        const [type, id, callAttributes] = savedObjectsClient.update.mock.calls[0];

        expect(type).toBe(SEARCH_SESSION_TYPE);
        expect(id).toBe(sessionId);
        expect(callAttributes).toHaveProperty('isCanceled', true);
      });

      it('throws if user conflicts', async () => {
        savedObjectsClient.get.mockResolvedValue(mockSavedObject);

        await expect(
          service.cancel({ savedObjectsClient }, mockUser2, sessionId)
        ).rejects.toMatchInlineSnapshot(`[Error: Not Found]`);
      });

      it('works without security', async () => {
        savedObjectsClient.get.mockResolvedValue(mockSavedObject);

        await service.cancel({ savedObjectsClient }, null, sessionId);

        const [type, id, callAttributes] = savedObjectsClient.update.mock.calls[0];

        expect(type).toBe(SEARCH_SESSION_TYPE);
        expect(id).toBe(sessionId);
        expect(callAttributes).toHaveProperty('isCanceled', true);
      });
    });

    describe('trackId', () => {
      it('updates the saved object if search session already exists', async () => {
        const searchRequest = { params: {} };
        const requestHash = createRequestHash(searchRequest.params);
        const searchId = 'FnpFYlBpeXdCUTMyZXhCLTc1TWFKX0EbdDFDTzJzTE1Sck9PVTBIcW1iU05CZzo4MDA0';

        const mockUpdateSavedObject = {
          ...mockSavedObject,
          attributes: {},
        };
        savedObjectsClient.update.mockResolvedValue(mockUpdateSavedObject);

        await service.trackId({ savedObjectsClient }, mockUser1, searchRequest, searchId, {
          sessionId,
          strategy: MOCK_STRATEGY,
        });

        expect(savedObjectsClient.update).toHaveBeenCalled();
        expect(savedObjectsClient.create).not.toHaveBeenCalled();

        const [type, id, callAttributes] = savedObjectsClient.update.mock.calls[0];
        expect(type).toBe(SEARCH_SESSION_TYPE);
        expect(id).toBe(sessionId);
        expect(callAttributes).toHaveProperty('idMapping', {
          [requestHash]: {
            id: searchId,
            strategy: MOCK_STRATEGY,
          },
        });
      });

      it('passes retryOnConflict param to es', async () => {
        const searchRequest = { params: {} };
        const searchId = 'FnpFYlBpeXdCUTMyZXhCLTc1TWFKX0EbdDFDTzJzTE1Sck9PVTBIcW1iU05CZzo4MDA0';

        await service.trackId({ savedObjectsClient }, mockUser1, searchRequest, searchId, {
          sessionId,
          strategy: MOCK_STRATEGY,
        });

        expect(savedObjectsClient.update).toHaveBeenCalled();

        const [, , , opts] = savedObjectsClient.update.mock.calls[0];
        expect(opts).toHaveProperty('retryOnConflict', MAX_UPDATE_RETRIES);
      });

      it('batches updates for the same session', async () => {
        const sessionId1 = 'sessiondId1';
        const sessionId2 = 'sessiondId2';

        const searchRequest1 = { params: { 1: '1' } };
        const requestHash1 = createRequestHash(searchRequest1.params);
        const searchId1 = 'searchId1';

        const searchRequest2 = { params: { 2: '2' } };
        const requestHash2 = createRequestHash(searchRequest2.params);
        const searchId2 = 'searchId1';

        const searchRequest3 = { params: { 3: '3' } };
        const requestHash3 = createRequestHash(searchRequest3.params);
        const searchId3 = 'searchId3';

        const mockUpdateSavedObject = {
          ...mockSavedObject,
          attributes: {},
        };
        savedObjectsClient.update.mockResolvedValue(mockUpdateSavedObject);

        await Promise.all([
          service.trackId({ savedObjectsClient }, mockUser1, searchRequest1, searchId1, {
            sessionId: sessionId1,
            strategy: MOCK_STRATEGY,
          }),
          service.trackId({ savedObjectsClient }, mockUser1, searchRequest2, searchId2, {
            sessionId: sessionId1,
            strategy: MOCK_STRATEGY,
          }),
          service.trackId({ savedObjectsClient }, mockUser1, searchRequest3, searchId3, {
            sessionId: sessionId2,
            strategy: MOCK_STRATEGY,
          }),
        ]);

        expect(savedObjectsClient.update).toHaveBeenCalledTimes(2); // 3 trackIds calls batched into 2 update calls (2 different sessions)
        expect(savedObjectsClient.create).not.toHaveBeenCalled();

        const sessionId1UpdateCallArgs = savedObjectsClient.update.mock.calls.find(
          (args) => args[1] === sessionId1
        );

        expect(sessionId1UpdateCallArgs).toBeDefined();

        const [type1, id1, callAttributes1] = sessionId1UpdateCallArgs!;
        expect(type1).toBe(SEARCH_SESSION_TYPE);
        expect(id1).toBe(sessionId1);
        expect(callAttributes1).toHaveProperty('idMapping', {
          [requestHash1]: {
            id: searchId1,
            strategy: MOCK_STRATEGY,
          },
          [requestHash2]: {
            id: searchId2,
            strategy: MOCK_STRATEGY,
          },
        });

        const sessionId2UpdateCallArgs = savedObjectsClient.update.mock.calls.find(
          (args) => args[1] === sessionId2
        );
        expect(sessionId2UpdateCallArgs).toBeDefined();
        const [type2, id2, callAttributes2] = sessionId2UpdateCallArgs!;
        expect(type2).toBe(SEARCH_SESSION_TYPE);
        expect(id2).toBe(sessionId2);
        expect(callAttributes2).toHaveProperty('idMapping', {
          [requestHash3]: {
            id: searchId3,
            strategy: MOCK_STRATEGY,
          },
        });
      });
    });

    describe('getId', () => {
      it('throws if `sessionId` is not provided', async () => {
        const searchRequest = { params: {} };

        await expect(() =>
          service.getId({ savedObjectsClient }, mockUser1, searchRequest, {})
        ).rejects.toMatchInlineSnapshot(`[Error: Session ID is required]`);
      });

      it('throws if there is not a saved object', async () => {
        const searchRequest = { params: {} };

        await expect(() =>
          service.getId({ savedObjectsClient }, mockUser1, searchRequest, {
            sessionId,
            isStored: false,
          })
        ).rejects.toMatchInlineSnapshot(
          `[Error: Cannot get search ID from a session that is not stored]`
        );
      });

      it('throws if not restoring a saved session', async () => {
        const searchRequest = { params: {} };

        await expect(() =>
          service.getId({ savedObjectsClient }, mockUser1, searchRequest, {
            sessionId,
            isStored: true,
            isRestore: false,
          })
        ).rejects.toMatchInlineSnapshot(
          `[Error: Get search ID is only supported when restoring a session]`
        );
      });

      it('returns the search ID from the saved object ID mapping', async () => {
        const searchRequest = { params: {} };
        const requestHash = createRequestHash(searchRequest.params);
        const searchId = 'FnpFYlBpeXdCUTMyZXhCLTc1TWFKX0EbdDFDTzJzTE1Sck9PVTBIcW1iU05CZzo4MDA0';
        const mockSession = {
          ...mockSavedObject,
          attributes: {
            ...mockSavedObject.attributes,
            idMapping: {
              [requestHash]: {
                id: searchId,
              },
            },
          },
        };
        savedObjectsClient.get.mockResolvedValue(mockSession);

        const id = await service.getId({ savedObjectsClient }, mockUser1, searchRequest, {
          sessionId,
          isStored: true,
          isRestore: true,
        });

        expect(id).toBe(searchId);
      });
    });

    describe('getSearchIdMapping', () => {
      it('retrieves the search IDs and strategies from the saved object', async () => {
        const mockSession = {
          ...mockSavedObject,
          attributes: {
            ...mockSavedObject.attributes,
            idMapping: {
              foo: {
                id: 'FnpFYlBpeXdCUTMyZXhCLTc1TWFKX0EbdDFDTzJzTE1Sck9PVTBIcW1iU05CZzo4MDA0',
                strategy: MOCK_STRATEGY,
              },
            },
          },
        };
        savedObjectsClient.get.mockResolvedValue(mockSession);
        const searchIdMapping = await service.getSearchIdMapping(
          { savedObjectsClient },
          mockUser1,
          mockSession.id
        );
        expect(searchIdMapping).toMatchInlineSnapshot(`
          Map {
            "FnpFYlBpeXdCUTMyZXhCLTc1TWFKX0EbdDFDTzJzTE1Sck9PVTBIcW1iU05CZzo4MDA0" => "ese",
          }
        `);
      });
    });
  });
});
