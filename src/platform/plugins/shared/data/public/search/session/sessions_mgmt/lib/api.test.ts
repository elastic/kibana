/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MockedKeys } from '@kbn/utility-types-jest';
import type { CoreSetup, CoreStart } from '@kbn/core/public';
import moment from 'moment';
import { coreMock } from '@kbn/core/public/mocks';
import type { SavedObjectsFindResponse } from '@kbn/core/server';
import { SessionsClient } from '../../..';
import { SearchSessionStatus } from '../../../../../common';
import { SearchSessionsMgmtAPI } from './api';
import type { SearchSessionsConfigSchema } from '../../../../../server/config';

let mockCoreSetup: MockedKeys<CoreSetup>;
let mockCoreStart: MockedKeys<CoreStart>;
let mockConfig: SearchSessionsConfigSchema;
let sessionsClient: SessionsClient;

describe('Search Sessions Management API', () => {
  beforeEach(() => {
    mockCoreSetup = coreMock.createSetup();
    mockCoreStart = coreMock.createStart();
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
                initialState: {},
                restoreState: {},
                idMapping: [],
              },
            },
          ],
          statuses: {
            'hello-pizza-123': { status: 'complete' },
          },
        };
      });

      const api = new SearchSessionsMgmtAPI(sessionsClient, mockConfig, {
        notifications: mockCoreStart.notifications,
        application: mockCoreStart.application,
        featureFlags: mockCoreStart.featureFlags,
      });

      const { savedObjects: results, statuses } = await api.fetchTableData();
      expect(results).toEqual([
        {
          id: 'hello-pizza-123',
          attributes: {
            name: 'Veggie',
            appId: 'pizza',
            initialState: {},
            restoreState: {},
            idMapping: [],
          },
        },
      ]);
      expect(statuses['hello-pizza-123']).toEqual({ status: 'complete' });
    });

    test('fetchDataTable returns saved objects for a specific appId', async () => {
      sessionsClient.find = jest.fn().mockImplementation(async () => {
        return {
          saved_objects: [
            {
              id: 'hello-pizza-123',
              attributes: {
                name: 'Veggie',
                appId: 'pizza',
                initialState: {},
                restoreState: {},
                idMapping: [],
              },
            },
            {
              id: 'hello-burguer-123',
              attributes: {
                name: 'Cheeseburguer',
                appId: 'burguer',
                initialState: {},
                restoreState: {},
                idMapping: [],
              },
            },
          ],
          statuses: {
            'hello-pizza-123': { status: 'complete' },
            'hello-burguer-123': { status: 'complete' },
          },
        };
      });

      const api = new SearchSessionsMgmtAPI(sessionsClient, mockConfig, {
        notifications: mockCoreStart.notifications,
        application: mockCoreStart.application,
        featureFlags: mockCoreStart.featureFlags,
      });

      const { savedObjects: results, statuses } = await api.fetchTableData({ appId: 'burguer' });
      expect(results).toEqual([
        {
          id: 'hello-burguer-123',
          attributes: {
            name: 'Cheeseburguer',
            appId: 'burguer',
            initialState: {},
            restoreState: {},
            idMapping: [],
          },
        },
      ]);
      expect(statuses['hello-burguer-123']).toEqual({ status: 'complete' });
    });

    test('expired session is showed as expired', async () => {
      sessionsClient.find = jest.fn().mockImplementation(async () => {
        return {
          saved_objects: [
            {
              id: 'hello-pizza-123',
              attributes: {
                name: 'Veggie',
                appId: 'pizza',
                expires: moment().subtract(3, 'days'),
                initialState: {},
                restoreState: {},
                idMapping: {},
              },
            },
          ],
          statuses: {
            'hello-pizza-123': { status: 'expired' },
          },
        };
      });

      const api = new SearchSessionsMgmtAPI(sessionsClient, mockConfig, {
        notifications: mockCoreStart.notifications,
        application: mockCoreStart.application,
        featureFlags: mockCoreStart.featureFlags,
      });

      const { savedObjects: res, statuses } = await api.fetchTableData();
      expect(statuses[res[0].id]).toEqual({ status: 'expired' });
    });

    test('handle error from sessionsClient response', async () => {
      sessionsClient.find = jest.fn().mockRejectedValue(new Error('implementation is so bad'));

      const api = new SearchSessionsMgmtAPI(sessionsClient, mockConfig, {
        notifications: mockCoreStart.notifications,
        application: mockCoreStart.application,
        featureFlags: mockCoreStart.featureFlags,
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
        notifications: mockCoreStart.notifications,
        application: mockCoreStart.application,
        featureFlags: mockCoreStart.featureFlags,
      });
      await api.fetchTableData();

      expect(mockCoreStart.notifications.toasts.addDanger).toHaveBeenCalledWith(
        'Fetching the Background Search info timed out after 1 seconds'
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
        notifications: mockCoreStart.notifications,
        application: mockCoreStart.application,
        featureFlags: mockCoreStart.featureFlags,
      });
      await api.sendDelete('abc-123-cool-session-ID');

      expect(mockCoreStart.notifications.toasts.addSuccess).toHaveBeenCalledWith({
        title: 'The background search was deleted.',
      });
    });

    test('error if deleting shows a toast message', async () => {
      sessionsClient.delete = jest.fn().mockRejectedValue(new Error('implementation is so bad'));

      const api = new SearchSessionsMgmtAPI(sessionsClient, mockConfig, {
        notifications: mockCoreStart.notifications,
        application: mockCoreStart.application,
        featureFlags: mockCoreStart.featureFlags,
      });
      await api.sendDelete('abc-123-cool-session-ID');

      expect(mockCoreStart.notifications.toasts.addError).toHaveBeenCalledWith(
        new Error('implementation is so bad'),
        { title: 'Failed to delete the background search!' }
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
        notifications: mockCoreStart.notifications,
        application: mockCoreStart.application,
        featureFlags: mockCoreStart.featureFlags,
      });
      await api.sendExtend('my-id', '5d');

      expect(sessionsClient.extend).toHaveBeenCalledTimes(1);
      expect(mockCoreStart.notifications.toasts.addSuccess).toHaveBeenCalled();
    });

    test('displays error on reject', async () => {
      sessionsClient.extend = jest.fn().mockRejectedValue({});
      const api = new SearchSessionsMgmtAPI(sessionsClient, mockConfig, {
        notifications: mockCoreStart.notifications,
        application: mockCoreStart.application,
        featureFlags: mockCoreStart.featureFlags,
      });
      await api.sendExtend('my-id', '5d');

      expect(sessionsClient.extend).toHaveBeenCalledTimes(1);
      expect(mockCoreStart.notifications.toasts.addError).toHaveBeenCalled();
    });
  });
});
