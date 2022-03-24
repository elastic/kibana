/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable dot-notation */
import { TelemetrySender } from './telemetry_sender';
import { mockTelemetryService } from '../mocks';
import { REPORT_INTERVAL_MS, LOCALSTORAGE_KEY } from '../../common/constants';

class LocalStorageMock implements Partial<Storage> {
  getItem = jest.fn();
  setItem = jest.fn();
}
const mockLocalStorage = new LocalStorageMock();
const originalLocalStorage = window.localStorage;
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('TelemetrySender', () => {
  let refreshConfigMock: jest.Mock;
  beforeEach(() => {
    refreshConfigMock = jest.fn();
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.setItem.mockClear();
  });
  afterAll(() =>
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
    })
  );

  describe('constructor', () => {
    it('defaults lastReport if unset', () => {
      const telemetryService = mockTelemetryService();
      const telemetrySender = new TelemetrySender(telemetryService, refreshConfigMock);
      expect(telemetrySender['lastReported']).toBeUndefined();
      expect(mockLocalStorage.getItem).toBeCalledTimes(1);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith(LOCALSTORAGE_KEY);
    });

    it('uses lastReport if set', () => {
      const lastReport = Date.now();
      mockLocalStorage.getItem.mockReturnValueOnce(JSON.stringify({ lastReport: `${lastReport}` }));
      const telemetryService = mockTelemetryService();
      const telemetrySender = new TelemetrySender(telemetryService, refreshConfigMock);
      expect(telemetrySender['lastReported']).toBe(lastReport);
    });
  });

  describe('updateLastReported', () => {
    it('stores the new lastReported value in the storage', () => {
      const lastReport = Date.now();
      const telemetryService = mockTelemetryService();
      const telemetrySender = new TelemetrySender(telemetryService, refreshConfigMock);
      telemetrySender['updateLastReported'](lastReport);

      expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(1);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        LOCALSTORAGE_KEY,
        JSON.stringify({ lastReport: `${lastReport}` })
      );
    });
  });

  describe('shouldSendReport', () => {
    let hasFocus: jest.SpyInstance;

    beforeEach(() => {
      hasFocus = jest.spyOn(document, 'hasFocus');
      hasFocus.mockReturnValue(true); // Return true by default for all tests;
    });

    afterEach(() => {
      hasFocus.mockRestore();
    });

    it('returns false if the page is not visible', async () => {
      hasFocus.mockReturnValue(false);
      const telemetryService = mockTelemetryService();
      telemetryService.getIsOptedIn = jest.fn().mockReturnValue(true);
      telemetryService.fetchLastReported = jest.fn().mockResolvedValue(Date.now());
      const telemetrySender = new TelemetrySender(telemetryService, refreshConfigMock);
      const shouldSendReport = await telemetrySender['shouldSendReport']();
      expect(shouldSendReport).toBe(false);
      expect(telemetryService.getIsOptedIn).toBeCalledTimes(0);
      expect(telemetryService.fetchLastReported).toBeCalledTimes(0);
      expect(refreshConfigMock).toBeCalledTimes(0);
    });

    it('returns false whenever optIn is false (no need to refresh the config)', async () => {
      const telemetryService = mockTelemetryService();
      telemetryService.getIsOptedIn = jest.fn().mockReturnValue(false);
      const telemetrySender = new TelemetrySender(telemetryService, refreshConfigMock);
      const shouldSendReport = await telemetrySender['shouldSendReport']();

      expect(refreshConfigMock).toBeCalledTimes(0);
      expect(telemetryService.getIsOptedIn).toBeCalledTimes(1);
      expect(shouldSendReport).toBe(false);
    });

    it('returns true if lastReported is undefined (both local and global)', async () => {
      const telemetryService = mockTelemetryService();
      telemetryService.getIsOptedIn = jest.fn().mockReturnValue(true);
      telemetryService.fetchLastReported = jest.fn().mockResolvedValue(undefined);
      const telemetrySender = new TelemetrySender(telemetryService, refreshConfigMock);
      const shouldSendReport = await telemetrySender['shouldSendReport']();

      expect(telemetrySender['lastReported']).toBeUndefined();
      expect(shouldSendReport).toBe(true);
      expect(telemetryService.fetchLastReported).toHaveBeenCalledTimes(1);
      expect(refreshConfigMock).toBeCalledTimes(1);
    });

    it('returns true if lastReported passed REPORT_INTERVAL_MS', async () => {
      const lastReported = Date.now() - (REPORT_INTERVAL_MS + 1000);

      const telemetryService = mockTelemetryService();
      telemetryService.getIsOptedIn = jest.fn().mockReturnValue(true);
      const telemetrySender = new TelemetrySender(telemetryService, refreshConfigMock);
      telemetrySender['lastReported'] = lastReported;
      const shouldSendReport = await telemetrySender['shouldSendReport']();
      expect(shouldSendReport).toBe(true);
      expect(refreshConfigMock).toBeCalledTimes(1);
    });

    it('returns false if local lastReported is within REPORT_INTERVAL_MS', async () => {
      const lastReported = Date.now() + 1000;

      const telemetryService = mockTelemetryService();
      telemetryService.getIsOptedIn = jest.fn().mockReturnValue(true);
      const telemetrySender = new TelemetrySender(telemetryService, refreshConfigMock);
      telemetrySender['lastReported'] = lastReported;
      const shouldSendReport = await telemetrySender['shouldSendReport']();
      expect(shouldSendReport).toBe(false);
      expect(refreshConfigMock).toBeCalledTimes(0);
    });

    it('returns false if local lastReported is expired but the remote is within REPORT_INTERVAL_MS', async () => {
      const telemetryService = mockTelemetryService();
      telemetryService.getIsOptedIn = jest.fn().mockReturnValue(true);
      telemetryService.fetchLastReported = jest.fn().mockResolvedValue(Date.now() + 1000);
      const telemetrySender = new TelemetrySender(telemetryService, refreshConfigMock);
      telemetrySender['lastReported'] = Date.now() - (REPORT_INTERVAL_MS + 1000);
      const shouldSendReport = await telemetrySender['shouldSendReport']();
      expect(shouldSendReport).toBe(false);
      expect(refreshConfigMock).toBeCalledTimes(0);
    });

    it('returns true if lastReported is malformed', async () => {
      const telemetryService = mockTelemetryService();
      telemetryService.getIsOptedIn = jest.fn().mockReturnValue(true);
      const telemetrySender = new TelemetrySender(telemetryService, refreshConfigMock);
      telemetrySender['lastReported'] = `random_malformed_string` as unknown as number;
      const shouldSendReport = await telemetrySender['shouldSendReport']();
      expect(shouldSendReport).toBe(true);
      expect(refreshConfigMock).toBeCalledTimes(1);
    });

    it('returns false if we are in screenshot mode', async () => {
      const telemetryService = mockTelemetryService({ isScreenshotMode: true });
      telemetryService.getIsOptedIn = jest.fn().mockReturnValue(false);
      const telemetrySender = new TelemetrySender(telemetryService, refreshConfigMock);
      const shouldSendReport = await telemetrySender['shouldSendReport']();

      expect(telemetryService.getIsOptedIn).toBeCalledTimes(0);
      expect(shouldSendReport).toBe(false);
      expect(refreshConfigMock).toBeCalledTimes(0);
    });
  });
  describe('sendIfDue', () => {
    let originalFetch: typeof window['fetch'];
    let mockFetch: jest.Mock<typeof window['fetch']>;

    beforeAll(() => {
      originalFetch = window.fetch;
    });

    beforeEach(() => (window.fetch = mockFetch = jest.fn()));
    afterAll(() => (window.fetch = originalFetch));

    it('does not send if shouldSendReport returns false', async () => {
      const telemetryService = mockTelemetryService();
      const telemetrySender = new TelemetrySender(telemetryService, refreshConfigMock);
      telemetrySender['shouldSendReport'] = jest.fn().mockReturnValue(false);
      telemetrySender['retryCount'] = 0;
      await telemetrySender['sendIfDue']();

      expect(telemetrySender['shouldSendReport']).toBeCalledTimes(1);
      expect(mockFetch).toBeCalledTimes(0);
    });

    it('does not send if we are in screenshot mode', async () => {
      const telemetryService = mockTelemetryService({ isScreenshotMode: true });
      const telemetrySender = new TelemetrySender(telemetryService, refreshConfigMock);
      await telemetrySender['sendIfDue']();

      expect(mockFetch).toBeCalledTimes(0);
    });

    it('updates last lastReported and calls saveToBrowser', async () => {
      const lastReported = Date.now() - (REPORT_INTERVAL_MS + 1000);

      const telemetryService = mockTelemetryService();
      const telemetrySender = new TelemetrySender(telemetryService, refreshConfigMock);
      telemetrySender['shouldSendReport'] = jest.fn().mockReturnValue(true);
      telemetrySender['sendUsageData'] = jest.fn().mockReturnValue(true);
      telemetrySender['updateLastReported'] = jest.fn().mockImplementation((value) => {
        expect(value).not.toBe(lastReported);
      });
      telemetrySender['lastReported'] = lastReported;

      await telemetrySender['sendIfDue']();

      expect(telemetrySender['updateLastReported']).toBeCalledTimes(1);
      expect(telemetrySender['retryCount']).toEqual(0);
      expect(telemetrySender['sendUsageData']).toHaveBeenCalledTimes(1);
    });

    it('resets the retry counter when report is due', async () => {
      const telemetryService = mockTelemetryService();
      const telemetrySender = new TelemetrySender(telemetryService, refreshConfigMock);
      telemetrySender['shouldSendReport'] = jest.fn().mockReturnValue(true);
      telemetrySender['sendUsageData'] = jest.fn();
      telemetrySender['updateLastReported'] = jest.fn();
      telemetrySender['retryCount'] = 9;

      await telemetrySender['sendIfDue']();
      expect(telemetrySender['retryCount']).toEqual(0);
      expect(telemetrySender['sendUsageData']).toHaveBeenCalledTimes(1);
    });
  });

  describe('sendUsageData', () => {
    let originalFetch: typeof window['fetch'];
    let mockFetch: jest.Mock<typeof window['fetch']>;
    let consoleWarnMock: jest.SpyInstance;

    beforeAll(() => {
      originalFetch = window.fetch;
    });

    beforeEach(() => {
      window.fetch = mockFetch = jest.fn();
      jest.useFakeTimers();
      consoleWarnMock = jest.spyOn(global.console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      jest.resetAllMocks();
    });

    afterAll(() => {
      window.fetch = originalFetch;
      jest.useRealTimers();
    });

    it('sends the report', async () => {
      const mockClusterUuid = 'mk_uuid';
      const mockTelemetryUrl = 'telemetry_cluster_url';
      const mockTelemetryPayload = [
        { clusterUuid: mockClusterUuid, stats: 'hashed_cluster_usage_data1' },
      ];

      const telemetryService = mockTelemetryService();
      const telemetrySender = new TelemetrySender(telemetryService, refreshConfigMock);
      telemetryService.getTelemetryUrl = jest.fn().mockReturnValue(mockTelemetryUrl);
      telemetryService.fetchTelemetry = jest.fn().mockReturnValue(mockTelemetryPayload);
      telemetrySender['shouldSendReport'] = jest.fn().mockReturnValue(true);

      await telemetrySender['sendUsageData']();

      expect(telemetryService.fetchTelemetry).toBeCalledTimes(1);
      expect(mockFetch).toBeCalledTimes(1);
      expect(mockFetch.mock.calls[0]).toMatchInlineSnapshot(`
          Array [
            "telemetry_cluster_url",
            Object {
              "body": "hashed_cluster_usage_data1",
              "headers": Object {
                "Content-Type": "application/json",
                "X-Elastic-Cluster-ID": "mk_uuid",
                "X-Elastic-Content-Encoding": "aes256gcm",
                "X-Elastic-Stack-Version": "mockKibanaVersion",
              },
              "method": "POST",
            },
          ]
        `);
    });

    it('sends report separately for every cluster', async () => {
      const mockTelemetryUrl = 'telemetry_cluster_url';
      const mockTelemetryPayload = ['hashed_cluster_usage_data1', 'hashed_cluster_usage_data2'];

      const telemetryService = mockTelemetryService();
      const telemetrySender = new TelemetrySender(telemetryService, refreshConfigMock);
      telemetryService.getTelemetryUrl = jest.fn().mockReturnValue(mockTelemetryUrl);
      telemetryService.fetchTelemetry = jest.fn().mockReturnValue(mockTelemetryPayload);
      telemetrySender['shouldSendReport'] = jest.fn().mockReturnValue(true);
      await telemetrySender['sendIfDue']();

      expect(telemetryService.fetchTelemetry).toBeCalledTimes(1);
      expect(mockFetch).toBeCalledTimes(2);
    });

    it('does not increase the retry counter on successful send', async () => {
      const mockTelemetryUrl = 'telemetry_cluster_url';
      const mockTelemetryPayload = ['hashed_cluster_usage_data1'];

      const telemetryService = mockTelemetryService();
      const telemetrySender = new TelemetrySender(telemetryService, refreshConfigMock);
      telemetryService.getTelemetryUrl = jest.fn().mockReturnValue(mockTelemetryUrl);
      telemetryService.fetchTelemetry = jest.fn().mockReturnValue(mockTelemetryPayload);
      telemetrySender['shouldSendReport'] = jest.fn().mockReturnValue(true);
      telemetrySender['updateLastReported'] = jest.fn();

      await telemetrySender['sendUsageData']();

      expect(mockFetch).toBeCalledTimes(1);
      expect(telemetrySender['retryCount']).toBe(0);
    });

    it('catches fetchTelemetry errors and retries again', async () => {
      const telemetryService = mockTelemetryService();
      const telemetrySender = new TelemetrySender(telemetryService, refreshConfigMock);
      telemetryService.getTelemetryUrl = jest.fn();
      telemetryService.fetchTelemetry = jest.fn().mockImplementation(() => {
        throw Error('Error fetching usage');
      });
      await telemetrySender['sendUsageData']();
      expect(telemetryService.fetchTelemetry).toBeCalledTimes(1);
      expect(telemetrySender['retryCount']).toBe(1);
      expect(setTimeout).toBeCalledTimes(1);
      expect(setTimeout).toBeCalledWith(telemetrySender['sendUsageData'], 120000);
      expect(consoleWarnMock).not.toBeCalled(); // console.warn is only triggered when the retryCount exceeds the allowed number
    });

    it('catches fetch errors and sets a new timeout if fetch fails more than once', async () => {
      const mockTelemetryPayload = ['hashed_cluster_usage_data1', 'hashed_cluster_usage_data2'];
      const telemetryService = mockTelemetryService();
      const telemetrySender = new TelemetrySender(telemetryService, refreshConfigMock);
      telemetryService.getTelemetryUrl = jest.fn();
      telemetryService.fetchTelemetry = jest.fn().mockReturnValue(mockTelemetryPayload);
      mockFetch.mockImplementation(() => {
        throw Error('Error sending usage');
      });
      telemetrySender['retryCount'] = 3;
      await telemetrySender['sendUsageData']();

      expect(telemetryService.fetchTelemetry).toBeCalledTimes(1);
      expect(mockFetch).toBeCalledTimes(2);
      expect(telemetrySender['retryCount']).toBe(4);
      expect(setTimeout).toBeCalledWith(telemetrySender['sendUsageData'], 960000);

      await telemetrySender['sendUsageData']();
      expect(telemetrySender['retryCount']).toBe(5);
      expect(setTimeout).toBeCalledWith(telemetrySender['sendUsageData'], 1920000);
      expect(consoleWarnMock).not.toBeCalled(); // console.warn is only triggered when the retryCount exceeds the allowed number
    });

    it('stops trying to resend the data after 20 retries', async () => {
      const telemetryService = mockTelemetryService();
      const telemetrySender = new TelemetrySender(telemetryService, refreshConfigMock);
      telemetryService.getTelemetryUrl = jest.fn();
      telemetryService.fetchTelemetry = jest.fn().mockImplementation(() => {
        throw Error('Error fetching usage');
      });
      telemetrySender['retryCount'] = 21;
      await telemetrySender['sendUsageData']();
      expect(setTimeout).not.toBeCalled();
      expect(consoleWarnMock.mock.calls[0][0]).toBe(
        'TelemetrySender.sendUsageData exceeds number of retry attempts with Error fetching usage'
      );
    });
  });

  describe('getRetryDelay', () => {
    beforeEach(() => jest.useFakeTimers());
    afterAll(() => jest.useRealTimers());

    it('sets a minimum retry delay of 60 seconds', () => {
      expect(TelemetrySender.getRetryDelay(0)).toBe(60000);
    });

    it('changes the retry delay depending on the retry count', () => {
      expect(TelemetrySender.getRetryDelay(3)).toBe(480000);
      expect(TelemetrySender.getRetryDelay(5)).toBe(1920000);
    });

    it('sets a maximum retry delay of 64 min', () => {
      expect(TelemetrySender.getRetryDelay(8)).toBe(3840000);
      expect(TelemetrySender.getRetryDelay(10)).toBe(3840000);
    });
  });

  describe('startChecking', () => {
    beforeEach(() => jest.useFakeTimers());
    afterAll(() => jest.useRealTimers());

    it('calls sendIfDue every 60000 ms', () => {
      const telemetryService = mockTelemetryService();
      const telemetrySender = new TelemetrySender(telemetryService, refreshConfigMock);
      telemetrySender['sendIfDue'] = jest.fn().mockResolvedValue(void 0);
      telemetrySender.startChecking();
      expect(telemetrySender['sendIfDue']).toHaveBeenCalledTimes(0);
      jest.advanceTimersByTime(60000);
      expect(telemetrySender['sendIfDue']).toHaveBeenCalledTimes(1);
    });
  });
});
