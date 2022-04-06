/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { MockedKeys } from '@kbn/utility-types/jest';
import { CoreSetup, CoreStart } from 'kibana/public';
import moment from 'moment';
import { coreMock } from 'src/core/public/mocks';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import type { SavedObjectsFindResponse } from 'src/core/server';
import { SessionsClient } from 'src/plugins/data/public/search';
import { SearchSessionStatus } from 'src/plugins/data/common';
import { sharePluginMock } from 'src/plugins/share/public/mocks';
import { SharePluginStart } from 'src/plugins/share/public';
import { SearchSessionsMgmtAPI } from './api';
import { SearchSessionsConfigSchema } from '../../../../../config';

let mockCoreSetup: MockedKeys<CoreSetup>;
let mockCoreStart: MockedKeys<CoreStart>;
let mockShareStart: jest.Mocked<SharePluginStart>;
let mockConfig: SearchSessionsConfigSchema;
let sessionsClient: SessionsClient;

describe('Search Sessions Management API', () => {
  beforeEach(() => {
    mockCoreSetup = coreMock.createSetup();
    mockCoreStart = coreMock.createStart();
    mockShareStart = sharePluginMock.createStartContract();
    mockConfig = {
      defaultExpiration: moment.duration('7d'),
      management: {
        expiresSoonWarning: moment.duration(1, 'days'),
        maxSessions: 2000,
        refreshInterval: moment.duration(1, 'seconds'),
        refreshTimeout: moment.duration(10, 'minutes'),
      },
    } as any;

    sessionsClient = new SessionsClient({ http: mockCoreSetup.http });
  });

  describe('listing', () => {
    test('fetchDataTable calls the listing endpoint', async () => {
      sessionsClient.find = jest.fn().mockImplementation(async () => {
        return {
          saved_objects: [
            {
              id: 'hello-pizza-123',
              attributes: {
                name: 'Veggie',
                appId: 'pizza',
                status: 'complete',
                initialState: {},
                restoreState: {},
                idMapping: [],
              },
            },
          ],
        } as SavedObjectsFindResponse;
      });

      const api = new SearchSessionsMgmtAPI(sessionsClient, mockConfig, {
        locators: mockShareStart.url.locators,
        notifications: mockCoreStart.notifications,
        application: mockCoreStart.application,
      });
      expect(await api.fetchTableData()).toMatchInlineSnapshot(`
        Array [
          Object {
            "actions": Array [
              "inspect",
              "rename",
              "extend",
              "delete",
            ],
            "appId": "pizza",
            "created": undefined,
            "expires": undefined,
            "id": "hello-pizza-123",
            "initialState": Object {},
            "name": "Veggie",
            "numSearches": 0,
            "reloadUrl": undefined,
            "restoreState": Object {},
            "restoreUrl": undefined,
            "status": "complete",
            "version": undefined,
          },
        ]
      `);
    });

    test('completed session with expired time is showed as expired', async () => {
      sessionsClient.find = jest.fn().mockImplementation(async () => {
        return {
          saved_objects: [
            {
              id: 'hello-pizza-123',
              attributes: {
                name: 'Veggie',
                appId: 'pizza',
                status: 'complete',
                expires: moment().subtract(3, 'days'),
                initialState: {},
                restoreState: {},
                idMapping: {},
              },
            },
          ],
        } as SavedObjectsFindResponse;
      });

      const api = new SearchSessionsMgmtAPI(sessionsClient, mockConfig, {
        locators: mockShareStart.url.locators,
        notifications: mockCoreStart.notifications,
        application: mockCoreStart.application,
      });

      const res = await api.fetchTableData();
      expect(res[0].status).toBe(SearchSessionStatus.EXPIRED);
    });

    test('handle error from sessionsClient response', async () => {
      sessionsClient.find = jest.fn().mockRejectedValue(new Error('implementation is so bad'));

      const api = new SearchSessionsMgmtAPI(sessionsClient, mockConfig, {
        locators: mockShareStart.url.locators,
        notifications: mockCoreStart.notifications,
        application: mockCoreStart.application,
      });
      await api.fetchTableData();

      expect(mockCoreStart.notifications.toasts.addError).toHaveBeenCalledWith(
        new Error('implementation is so bad'),
        { title: 'Failed to refresh the page!' }
      );
    });

    test('handle timeout error', async () => {
      mockConfig = {
        ...mockConfig,
        management: {
          ...mockConfig.management,
          refreshInterval: moment.duration(1, 'hours'),
          refreshTimeout: moment.duration(1, 'seconds'),
        },
      };

      sessionsClient.find = jest.fn().mockImplementation(async () => {
        return new Promise((resolve) => {
          setTimeout(resolve, 2000);
        });
      });

      const api = new SearchSessionsMgmtAPI(sessionsClient, mockConfig, {
        locators: mockShareStart.url.locators,
        notifications: mockCoreStart.notifications,
        application: mockCoreStart.application,
      });
      await api.fetchTableData();

      expect(mockCoreStart.notifications.toasts.addDanger).toHaveBeenCalledWith(
        'Fetching the Search Session info timed out after 1 seconds'
      );
    });
  });

  describe('cancel', () => {
    beforeEach(() => {
      sessionsClient.find = jest.fn().mockImplementation(async () => {
        return {
          saved_objects: [
            {
              id: 'hello-pizza-123',
              attributes: { name: 'Veggie', appId: 'pizza', status: 'baked' },
            },
          ],
        } as SavedObjectsFindResponse;
      });
    });

    test('send cancel calls the cancel endpoint with a session ID', async () => {
      const api = new SearchSessionsMgmtAPI(sessionsClient, mockConfig, {
        locators: mockShareStart.url.locators,
        notifications: mockCoreStart.notifications,
        application: mockCoreStart.application,
      });
      await api.sendCancel('abc-123-cool-session-ID');

      expect(mockCoreStart.notifications.toasts.addSuccess).toHaveBeenCalledWith({
        title: 'The search session was deleted.',
      });
    });

    test('error if deleting shows a toast message', async () => {
      sessionsClient.delete = jest.fn().mockRejectedValue(new Error('implementation is so bad'));

      const api = new SearchSessionsMgmtAPI(sessionsClient, mockConfig, {
        locators: mockShareStart.url.locators,
        notifications: mockCoreStart.notifications,
        application: mockCoreStart.application,
      });
      await api.sendCancel('abc-123-cool-session-ID');

      expect(mockCoreStart.notifications.toasts.addError).toHaveBeenCalledWith(
        new Error('implementation is so bad'),
        { title: 'Failed to delete the search session!' }
      );
    });
  });

  describe('extend', () => {
    beforeEach(() => {
      sessionsClient.extend = jest.fn().mockImplementation(async () => {
        return {
          saved_objects: [
            {
              id: 'hello-pizza-123',
              attributes: { name: 'Veggie', appId: 'pizza', status: SearchSessionStatus.COMPLETE },
            },
          ],
        } as SavedObjectsFindResponse;
      });
    });

    test('send extend throws an error for now', async () => {
      const api = new SearchSessionsMgmtAPI(sessionsClient, mockConfig, {
        locators: mockShareStart.url.locators,
        notifications: mockCoreStart.notifications,
        application: mockCoreStart.application,
      });
      await api.sendExtend('my-id', '5d');

      expect(sessionsClient.extend).toHaveBeenCalledTimes(1);
      expect(mockCoreStart.notifications.toasts.addSuccess).toHaveBeenCalled();
    });

    test('displays error on reject', async () => {
      sessionsClient.extend = jest.fn().mockRejectedValue({});
      const api = new SearchSessionsMgmtAPI(sessionsClient, mockConfig, {
        locators: mockShareStart.url.locators,
        notifications: mockCoreStart.notifications,
        application: mockCoreStart.application,
      });
      await api.sendExtend('my-id', '5d');

      expect(sessionsClient.extend).toHaveBeenCalledTimes(1);
      expect(mockCoreStart.notifications.toasts.addError).toHaveBeenCalled();
    });
  });
});
