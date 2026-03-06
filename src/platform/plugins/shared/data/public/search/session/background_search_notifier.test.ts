/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock } from '@kbn/core/public/mocks';
import { BackgroundSearchNotifier } from './background_search_notifier';
import { getSessionsClientMock } from './mocks';
import { getInProgressSessionIds, setInProgressSessionIds } from './in_progress_session';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';

jest.mock('./in_progress_session');
const mockGetInProgressSessionIds = jest.mocked(getInProgressSessionIds);
const mockSetInProgressSessionIds = jest.mocked(setInProgressSessionIds);

const locatorsMock = sharePluginMock.createStartContract().url.locators;

describe('BackgroundSearchNotifier', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('during polling', () => {
    describe('when there are no in-progress sessions', () => {
      it('should not call status endpoint', async () => {
        // Given
        const sessionsClientMock = getSessionsClientMock({
          status: jest.fn().mockResolvedValue({ statuses: {}, sessions: {} }),
        });
        const coreStartMock = coreMock.createStart();
        const backgroundSearchNotifier = new BackgroundSearchNotifier(
          sessionsClientMock,
          coreStartMock,
          locatorsMock
        );
        mockGetInProgressSessionIds.mockReturnValue([]);

        // When
        backgroundSearchNotifier.startPolling(1000);
        jest.advanceTimersByTime(1000);

        // Then
        expect(sessionsClientMock.status).not.toHaveBeenCalled();
      });
    });

    describe('when sessions remain in-progress', () => {
      it('should keep tracking them', async () => {
        // Given
        const sessionsClientMock = getSessionsClientMock({
          status: jest.fn().mockResolvedValue({
            statuses: {
              'session-1': { status: 'in_progress' },
              'session-2': { status: 'in_progress' },
            },
            sessions: {},
          }),
        });
        const coreStartMock = coreMock.createStart();
        const backgroundSearchNotifier = new BackgroundSearchNotifier(
          sessionsClientMock,
          coreStartMock,
          locatorsMock
        );
        mockGetInProgressSessionIds.mockReturnValue(['session-1', 'session-2']);

        // When
        backgroundSearchNotifier.startPolling(1000);
        await jest.advanceTimersByTimeAsync(1000);

        // Then
        expect(sessionsClientMock.status).toHaveBeenCalledWith(['session-1', 'session-2']);
        expect(mockSetInProgressSessionIds).toHaveBeenCalledWith(['session-1', 'session-2']);
        expect(coreStartMock.notifications.toasts.addSuccess).not.toHaveBeenCalled();
        expect(coreStartMock.notifications.toasts.addDanger).not.toHaveBeenCalled();
      });
    });

    describe('when sessions complete', () => {
      it('should show success notifications and remove from tracking', async () => {
        // Given
        const sessionsClientMock = getSessionsClientMock({
          status: jest.fn().mockResolvedValue({
            statuses: {
              'session-1': { status: 'complete' },
              'session-2': { status: 'complete' },
            },
            sessions: {
              'session-1': {
                name: 'session-1',
                locatorId: 'DISCOVER_APP_LOCATOR',
                restoreState: {},
              },
              'session-2': {
                name: 'session-2',
                locatorId: 'DISCOVER_APP_LOCATOR',
                restoreState: {},
              },
            },
          }),
        });
        const coreStartMock = coreMock.createStart();
        const backgroundSearchNotifier = new BackgroundSearchNotifier(
          sessionsClientMock,
          coreStartMock,
          locatorsMock
        );
        // First call is for the initial poll, second call is for the next interval
        mockGetInProgressSessionIds
          .mockReturnValueOnce(['session-1', 'session-2'])
          .mockReturnValueOnce([]);

        // When
        backgroundSearchNotifier.startPolling(1000);
        await jest.advanceTimersByTimeAsync(1000);
        backgroundSearchNotifier.stopPolling();

        // Then
        expect(mockSetInProgressSessionIds).toHaveBeenCalledWith([]);
        expect(coreStartMock.notifications.toasts.addSuccess).toHaveBeenCalledTimes(2);
        expect(coreStartMock.notifications.toasts.addDanger).not.toHaveBeenCalled();
      });
    });

    describe('when sessions fail', () => {
      it('should show error notifications and remove from tracking', async () => {
        // Given
        const sessionsClientMock = getSessionsClientMock({
          status: jest.fn().mockResolvedValue({
            statuses: {
              'session-1': { status: 'error' },
              'session-2': { status: 'cancelled' },
            },
            sessions: {
              'session-1': {
                name: 'session-1',
                locatorId: 'DISCOVER_APP_LOCATOR',
                restoreState: {},
              },
              'session-2': {
                name: 'session-2',
                locatorId: 'DISCOVER_APP_LOCATOR',
                restoreState: {},
              },
            },
          }),
        });
        const coreStartMock = coreMock.createStart();
        const backgroundSearchNotifier = new BackgroundSearchNotifier(
          sessionsClientMock,
          coreStartMock,
          locatorsMock
        );
        // First call is for the initial poll, second call is for the next interval
        mockGetInProgressSessionIds
          .mockReturnValueOnce(['session-1', 'session-2'])
          .mockReturnValueOnce([]);

        // When
        backgroundSearchNotifier.startPolling(1000);
        await jest.advanceTimersByTimeAsync(1000);
        backgroundSearchNotifier.stopPolling();

        // Then
        expect(mockSetInProgressSessionIds).toHaveBeenCalledWith([]);
        expect(coreStartMock.notifications.toasts.addDanger).toHaveBeenCalledTimes(2);
        expect(coreStartMock.notifications.toasts.addSuccess).not.toHaveBeenCalled();
      });
    });

    describe('when sessions have mixed statuses', () => {
      it('should handle each status appropriately', async () => {
        // Given
        const sessionsClientMock = getSessionsClientMock({
          status: jest.fn().mockResolvedValue({
            statuses: {
              'session-1': { status: 'in_progress' },
              'session-2': { status: 'complete' },
              'session-3': { status: 'error' },
              'session-4': { status: 'in_progress' },
            },
            sessions: {
              'session-2': {
                name: 'session-2',
                locatorId: 'DISCOVER_APP_LOCATOR',
                restoreState: {},
              },
              'session-3': {
                name: 'session-3',
                locatorId: 'DISCOVER_APP_LOCATOR',
                restoreState: {},
              },
            },
          }),
        });
        const coreStartMock = coreMock.createStart();
        const backgroundSearchNotifier = new BackgroundSearchNotifier(
          sessionsClientMock,
          coreStartMock,
          locatorsMock
        );
        // First call is for the initial poll, second call is for the next interval
        mockGetInProgressSessionIds
          .mockReturnValueOnce(['session-1', 'session-2', 'session-3', 'session-4'])
          .mockReturnValueOnce(['session-1', 'session-4']);

        // When
        backgroundSearchNotifier.startPolling(1000);
        await jest.advanceTimersByTimeAsync(1000);
        backgroundSearchNotifier.stopPolling();

        // Then
        expect(mockSetInProgressSessionIds).toHaveBeenCalledWith(['session-1', 'session-4']);
        expect(coreStartMock.notifications.toasts.addSuccess).toHaveBeenCalledTimes(1);
        expect(coreStartMock.notifications.toasts.addDanger).toHaveBeenCalledTimes(1);
      });
    });

    describe('when sessions are not found in status response', () => {
      it('should treat them as still in-progress', async () => {
        // Given
        const sessionsClientMock = getSessionsClientMock({
          status: jest.fn().mockResolvedValue({
            statuses: {
              'session-1': { status: 'in_progress' },
              // session-2 and session-3 not in response
            },
            sessions: {},
          }),
        });
        const coreStartMock = coreMock.createStart();
        const backgroundSearchNotifier = new BackgroundSearchNotifier(
          sessionsClientMock,
          coreStartMock,
          locatorsMock
        );
        mockGetInProgressSessionIds.mockReturnValue(['session-1', 'session-2', 'session-3']);

        // When
        backgroundSearchNotifier.startPolling(1000);
        await jest.advanceTimersByTimeAsync(1000);

        // Then
        expect(mockSetInProgressSessionIds).toHaveBeenCalledWith([
          'session-1',
          'session-2',
          'session-3',
        ]);
        expect(coreStartMock.notifications.toasts.addSuccess).not.toHaveBeenCalled();
        expect(coreStartMock.notifications.toasts.addDanger).not.toHaveBeenCalled();
      });
    });

    describe('when status endpoint throws', () => {
      it('should continue polling on the next tick', async () => {
        // Given
        const sessionsClientMock = getSessionsClientMock({
          status: jest
            .fn()
            .mockRejectedValueOnce(new Error('network'))
            .mockResolvedValueOnce({
              statuses: {
                'session-1': { status: 'complete' },
              },
              sessions: {
                'session-1': {
                  name: 'session-1',
                  locatorId: 'DISCOVER_APP_LOCATOR',
                  restoreState: {},
                },
              },
            }),
        });
        const coreStartMock = coreMock.createStart();
        const backgroundSearchNotifier = new BackgroundSearchNotifier(
          sessionsClientMock,
          coreStartMock,
          locatorsMock
        );
        mockGetInProgressSessionIds
          .mockReturnValueOnce(['session-1'])
          .mockReturnValueOnce(['session-1'])
          .mockReturnValueOnce([]);

        // When
        backgroundSearchNotifier.startPolling(1000);
        await jest.advanceTimersByTimeAsync(1000);
        backgroundSearchNotifier.stopPolling();

        // Then
        expect(sessionsClientMock.status).toHaveBeenCalledTimes(2);
        expect(coreStartMock.notifications.toasts.addSuccess).toHaveBeenCalledTimes(1);
        expect(coreStartMock.notifications.toasts.addDanger).not.toHaveBeenCalled();
      });
    });

    describe('when status request is slow', () => {
      it('should not overlap polling requests', async () => {
        // Given
        const deferred: { promise: Promise<any>; resolve: (value: any) => void } = {
          promise: Promise.resolve(),
          resolve: () => undefined,
        };
        deferred.promise = new Promise((resolve) => {
          deferred.resolve = resolve;
        });

        const sessionsClientMock = getSessionsClientMock({
          status: jest.fn().mockReturnValue(deferred.promise),
        });
        const coreStartMock = coreMock.createStart();
        const backgroundSearchNotifier = new BackgroundSearchNotifier(
          sessionsClientMock,
          coreStartMock,
          locatorsMock
        );
        mockGetInProgressSessionIds.mockReturnValue(['session-1']);

        // When
        backgroundSearchNotifier.startPolling(1000);
        jest.advanceTimersByTime(3000);

        // Then (no overlap while the first request is still in-flight)
        expect(sessionsClientMock.status).toHaveBeenCalledTimes(1);

        // When the request completes, the next tick should be able to run again
        deferred.resolve({
          statuses: {
            'session-1': { status: 'in_progress' },
          },
          sessions: {},
        });
        await jest.advanceTimersByTimeAsync(0);
        await jest.advanceTimersByTimeAsync(1000);

        expect(sessionsClientMock.status).toHaveBeenCalledTimes(2);
        backgroundSearchNotifier.stopPolling();
      });
    });
  });
});
