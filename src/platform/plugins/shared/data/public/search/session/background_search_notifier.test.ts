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

jest.mock('./in_progress_session');
const mockGetInProgressSessionIds = jest.mocked(getInProgressSessionIds);
const mockSetInProgressSessionIds = jest.mocked(setInProgressSessionIds);

describe('BackgroundSearchNotifier', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('when startPolling is called', () => {
    it('should request the in-progress sessions', async () => {
      // Given
      const sessionsClientMock = getSessionsClientMock({
        find: jest.fn().mockResolvedValue({ statuses: {} }),
        status: jest.fn().mockResolvedValue({ statuses: {} }),
      });
      const coreStartMock = coreMock.createStart();
      const backgroundSearchNotifier = new BackgroundSearchNotifier(
        sessionsClientMock,
        coreStartMock
      );
      mockGetInProgressSessionIds.mockReturnValue([]);

      // When
      await backgroundSearchNotifier.startPolling(0);

      // Then
      expect(sessionsClientMock.find).toHaveBeenCalledWith({
        filter: 'search-session.attributes.status: "in_progress"',
      });
    });

    describe('when there are no local sessions and no server sessions', () => {
      it('should set empty array', async () => {
        // Given
        const sessionsClientMock = getSessionsClientMock({
          find: jest.fn().mockResolvedValue({ statuses: {} }),
          status: jest.fn().mockResolvedValue({ statuses: {} }),
        });
        const coreStartMock = coreMock.createStart();
        const backgroundSearchNotifier = new BackgroundSearchNotifier(
          sessionsClientMock,
          coreStartMock
        );
        mockGetInProgressSessionIds.mockReturnValue([]);

        // When
        await backgroundSearchNotifier.startPolling(0);

        // Then
        expect(mockSetInProgressSessionIds).toHaveBeenCalledWith([]);
        expect(coreStartMock.notifications.toasts.addSuccess).not.toHaveBeenCalled();
        expect(coreStartMock.notifications.toasts.addDanger).not.toHaveBeenCalled();
      });
    });

    describe('when there are no local sessions but server has in-progress sessions', () => {
      it('should add server sessions to local tracking', async () => {
        // Given
        const sessionsClientMock = getSessionsClientMock({
          find: jest.fn().mockResolvedValue({
            statuses: {
              'session-1': { status: 'in_progress' },
              'session-2': { status: 'in_progress' },
            },
          }),
          status: jest.fn().mockResolvedValue({ statuses: {} }),
        });
        const coreStartMock = coreMock.createStart();
        const backgroundSearchNotifier = new BackgroundSearchNotifier(
          sessionsClientMock,
          coreStartMock
        );
        mockGetInProgressSessionIds.mockReturnValue([]);

        // When
        await backgroundSearchNotifier.startPolling(0);

        // Then
        expect(mockSetInProgressSessionIds).toHaveBeenCalledWith(['session-1', 'session-2']);
        expect(coreStartMock.notifications.toasts.addSuccess).not.toHaveBeenCalled();
        expect(coreStartMock.notifications.toasts.addDanger).not.toHaveBeenCalled();
      });
    });

    describe('when server has sessions including some locally tracked', () => {
      it('should merge local and server in-progress sessions', async () => {
        // Given
        const sessionsClientMock = getSessionsClientMock({
          find: jest.fn().mockResolvedValue({
            statuses: {
              'session-2': { status: 'in_progress' },
              'session-3': { status: 'in_progress' },
            },
          }),
          status: jest.fn().mockResolvedValue({ statuses: {} }),
        });
        const coreStartMock = coreMock.createStart();
        const backgroundSearchNotifier = new BackgroundSearchNotifier(
          sessionsClientMock,
          coreStartMock
        );
        mockGetInProgressSessionIds.mockReturnValue(['session-1', 'session-2']);

        // When
        await backgroundSearchNotifier.startPolling(0);

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

    describe('when local sessions exist but are not on server', () => {
      it('should keep local sessions for status checking', async () => {
        // Given
        const sessionsClientMock = getSessionsClientMock({
          find: jest.fn().mockResolvedValue({
            statuses: {
              'session-3': { status: 'in_progress' },
            },
          }),
          status: jest.fn().mockResolvedValue({ statuses: {} }),
        });
        const coreStartMock = coreMock.createStart();
        const backgroundSearchNotifier = new BackgroundSearchNotifier(
          sessionsClientMock,
          coreStartMock
        );
        mockGetInProgressSessionIds.mockReturnValue(['session-1', 'session-2']);

        // When
        await backgroundSearchNotifier.startPolling(0);

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
  });

  describe('during polling', () => {
    describe('when there are no in-progress sessions', () => {
      it('should not call status endpoint', async () => {
        // Given
        const sessionsClientMock = getSessionsClientMock({
          find: jest.fn().mockResolvedValue({ statuses: {} }),
          status: jest.fn().mockResolvedValue({ statuses: {} }),
        });
        const coreStartMock = coreMock.createStart();
        const backgroundSearchNotifier = new BackgroundSearchNotifier(
          sessionsClientMock,
          coreStartMock
        );
        mockGetInProgressSessionIds.mockReturnValue([]);

        // When
        await backgroundSearchNotifier.startPolling(1000);
        jest.advanceTimersByTime(1000);

        // Then
        expect(sessionsClientMock.status).not.toHaveBeenCalled();
      });
    });

    describe('when sessions remain in-progress', () => {
      it('should keep tracking them', async () => {
        // Given
        const sessionsClientMock = getSessionsClientMock({
          find: jest.fn().mockResolvedValue({ statuses: {} }),
          status: jest.fn().mockResolvedValue({
            statuses: {
              'session-1': { status: 'in_progress' },
              'session-2': { status: 'in_progress' },
            },
          }),
        });
        const coreStartMock = coreMock.createStart();
        const backgroundSearchNotifier = new BackgroundSearchNotifier(
          sessionsClientMock,
          coreStartMock
        );
        mockGetInProgressSessionIds.mockReturnValue(['session-1', 'session-2']);

        // When
        await backgroundSearchNotifier.startPolling(1000);
        jest.advanceTimersByTime(1000);
        await Promise.resolve(); // Flush promises

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
          find: jest.fn().mockResolvedValue({ statuses: {} }),
          status: jest.fn().mockResolvedValue({
            statuses: {
              'session-1': { status: 'complete' },
              'session-2': { status: 'complete' },
            },
          }),
        });
        const coreStartMock = coreMock.createStart();
        const backgroundSearchNotifier = new BackgroundSearchNotifier(
          sessionsClientMock,
          coreStartMock
        );
        // First call is for initial load, second call is during first poll, third call before second poll
        mockGetInProgressSessionIds
          .mockReturnValueOnce([])
          .mockReturnValueOnce(['session-1', 'session-2'])
          .mockReturnValue([]);

        // When
        await backgroundSearchNotifier.startPolling(1000);
        await jest.advanceTimersByTimeAsync(1000);
        backgroundSearchNotifier.stopPolling();

        // Then
        expect(mockSetInProgressSessionIds).toHaveBeenCalledWith([]);
        expect(coreStartMock.notifications.toasts.addSuccess).toHaveBeenCalledTimes(2);
        expect(coreStartMock.notifications.toasts.addSuccess).toHaveBeenCalledWith({
          title: 'Background search completed',
          text: 'Search session session-1 has completed successfully.',
        });
        expect(coreStartMock.notifications.toasts.addSuccess).toHaveBeenCalledWith({
          title: 'Background search completed',
          text: 'Search session session-2 has completed successfully.',
        });
        expect(coreStartMock.notifications.toasts.addDanger).not.toHaveBeenCalled();
      });
    });

    describe('when sessions fail', () => {
      it('should show error notifications and remove from tracking', async () => {
        // Given
        const sessionsClientMock = getSessionsClientMock({
          find: jest.fn().mockResolvedValue({ statuses: {} }),
          status: jest.fn().mockResolvedValue({
            statuses: {
              'session-1': { status: 'error' },
              'session-2': { status: 'cancelled' },
            },
          }),
        });
        const coreStartMock = coreMock.createStart();
        const backgroundSearchNotifier = new BackgroundSearchNotifier(
          sessionsClientMock,
          coreStartMock
        );
        // First call is for initial load, second call is during first poll, third call before second poll
        mockGetInProgressSessionIds
          .mockReturnValueOnce([])
          .mockReturnValueOnce(['session-1', 'session-2'])
          .mockReturnValue([]);

        // When
        await backgroundSearchNotifier.startPolling(1000);
        await jest.advanceTimersByTimeAsync(1000);
        backgroundSearchNotifier.stopPolling();

        // Then
        expect(mockSetInProgressSessionIds).toHaveBeenCalledWith([]);
        expect(coreStartMock.notifications.toasts.addDanger).toHaveBeenCalledTimes(2);
        expect(coreStartMock.notifications.toasts.addDanger).toHaveBeenCalledWith({
          title: 'Background search failed',
          text: 'Search session session-1 has failed.',
        });
        expect(coreStartMock.notifications.toasts.addDanger).toHaveBeenCalledWith({
          title: 'Background search failed',
          text: 'Search session session-2 has failed.',
        });
        expect(coreStartMock.notifications.toasts.addSuccess).not.toHaveBeenCalled();
      });
    });

    describe('when sessions have mixed statuses', () => {
      it('should handle each status appropriately', async () => {
        // Given
        const sessionsClientMock = getSessionsClientMock({
          find: jest.fn().mockResolvedValue({ statuses: {} }),
          status: jest.fn().mockResolvedValue({
            statuses: {
              'session-1': { status: 'in_progress' },
              'session-2': { status: 'complete' },
              'session-3': { status: 'error' },
              'session-4': { status: 'in_progress' },
            },
          }),
        });
        const coreStartMock = coreMock.createStart();
        const backgroundSearchNotifier = new BackgroundSearchNotifier(
          sessionsClientMock,
          coreStartMock
        );
        // First call is for initial load, second call is during first poll, third call before second poll
        mockGetInProgressSessionIds
          .mockReturnValueOnce([])
          .mockReturnValueOnce(['session-1', 'session-2', 'session-3', 'session-4'])
          .mockReturnValue(['session-1', 'session-4']);

        // When
        await backgroundSearchNotifier.startPolling(1000);
        await jest.advanceTimersByTimeAsync(1000);
        backgroundSearchNotifier.stopPolling();

        // Then
        expect(mockSetInProgressSessionIds).toHaveBeenCalledWith(['session-1', 'session-4']);
        expect(coreStartMock.notifications.toasts.addSuccess).toHaveBeenCalledTimes(1);
        expect(coreStartMock.notifications.toasts.addSuccess).toHaveBeenCalledWith({
          title: 'Background search completed',
          text: 'Search session session-2 has completed successfully.',
        });
        expect(coreStartMock.notifications.toasts.addDanger).toHaveBeenCalledTimes(1);
        expect(coreStartMock.notifications.toasts.addDanger).toHaveBeenCalledWith({
          title: 'Background search failed',
          text: 'Search session session-3 has failed.',
        });
      });
    });

    describe('when sessions are not found in status response', () => {
      it('should treat them as still in-progress', async () => {
        // Given
        const sessionsClientMock = getSessionsClientMock({
          find: jest.fn().mockResolvedValue({ statuses: {} }),
          status: jest.fn().mockResolvedValue({
            statuses: {
              'session-1': { status: 'in_progress' },
              // session-2 and session-3 not in response
            },
          }),
        });
        const coreStartMock = coreMock.createStart();
        const backgroundSearchNotifier = new BackgroundSearchNotifier(
          sessionsClientMock,
          coreStartMock
        );
        mockGetInProgressSessionIds.mockReturnValue(['session-1', 'session-2', 'session-3']);

        // When
        await backgroundSearchNotifier.startPolling(1000);
        jest.advanceTimersByTime(1000);
        await Promise.resolve(); // Flush promises

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
  });
});
