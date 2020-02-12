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

/* eslint-disable dot-notation */
import { TelemetrySender } from './telemetry_sender';
import { mockTelemetryService } from '../mocks';
import { REPORT_INTERVAL_MS, LOCALSTORAGE_KEY } from '../../common/constants';

class LocalStorageMock implements Partial<Storage> {
  getItem = jest.fn();
  setItem = jest.fn();
}

describe('TelemetrySender', () => {
  let originalLocalStorage: Storage;
  let mockLocalStorage: LocalStorageMock;
  beforeAll(() => {
    originalLocalStorage = window.localStorage;
  });

  // @ts-ignore
  beforeEach(() => (window.localStorage = mockLocalStorage = new LocalStorageMock()));
  // @ts-ignore
  afterAll(() => (window.localStorage = originalLocalStorage));

  describe('constructor', () => {
    it('defaults lastReport if unset', () => {
      const telemetryService = mockTelemetryService();
      const telemetrySender = new TelemetrySender(telemetryService);
      expect(telemetrySender['lastReported']).toBeUndefined();
      expect(mockLocalStorage.getItem).toBeCalledTimes(1);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith(LOCALSTORAGE_KEY);
    });

    it('uses lastReport if set', () => {
      const lastReport = `${Date.now()}`;
      mockLocalStorage.getItem.mockReturnValueOnce(JSON.stringify({ lastReport }));
      const telemetryService = mockTelemetryService();
      const telemetrySender = new TelemetrySender(telemetryService);
      expect(telemetrySender['lastReported']).toBe(lastReport);
    });
  });

  describe('saveToBrowser', () => {
    it('uses lastReport', () => {
      const lastReport = `${Date.now()}`;
      const telemetryService = mockTelemetryService();
      const telemetrySender = new TelemetrySender(telemetryService);
      telemetrySender['lastReported'] = lastReport;
      telemetrySender['saveToBrowser']();

      expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(1);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        LOCALSTORAGE_KEY,
        JSON.stringify({ lastReport })
      );
    });
  });

  describe('shouldSendReport', () => {
    it('returns false whenever optIn is false', () => {
      const telemetryService = mockTelemetryService();
      telemetryService.getIsOptedIn = jest.fn().mockReturnValue(false);
      const telemetrySender = new TelemetrySender(telemetryService);
      const shouldSendRerpot = telemetrySender['shouldSendReport']();

      expect(telemetryService.getIsOptedIn).toBeCalledTimes(1);
      expect(shouldSendRerpot).toBe(false);
    });

    it('returns true if lastReported is undefined', () => {
      const telemetryService = mockTelemetryService();
      telemetryService.getIsOptedIn = jest.fn().mockReturnValue(true);
      const telemetrySender = new TelemetrySender(telemetryService);
      const shouldSendRerpot = telemetrySender['shouldSendReport']();

      expect(telemetrySender['lastReported']).toBeUndefined();
      expect(shouldSendRerpot).toBe(true);
    });

    it('returns true if lastReported passed REPORT_INTERVAL_MS', () => {
      const lastReported = Date.now() - (REPORT_INTERVAL_MS + 1000);

      const telemetryService = mockTelemetryService();
      telemetryService.getIsOptedIn = jest.fn().mockReturnValue(true);
      const telemetrySender = new TelemetrySender(telemetryService);
      telemetrySender['lastReported'] = `${lastReported}`;
      const shouldSendRerpot = telemetrySender['shouldSendReport']();
      expect(shouldSendRerpot).toBe(true);
    });

    it('returns false if lastReported is within REPORT_INTERVAL_MS', () => {
      const lastReported = Date.now() + 1000;

      const telemetryService = mockTelemetryService();
      telemetryService.getIsOptedIn = jest.fn().mockReturnValue(true);
      const telemetrySender = new TelemetrySender(telemetryService);
      telemetrySender['lastReported'] = `${lastReported}`;
      const shouldSendRerpot = telemetrySender['shouldSendReport']();
      expect(shouldSendRerpot).toBe(false);
    });

    it('returns true if lastReported is malformed', () => {
      const telemetryService = mockTelemetryService();
      telemetryService.getIsOptedIn = jest.fn().mockReturnValue(true);
      const telemetrySender = new TelemetrySender(telemetryService);
      telemetrySender['lastReported'] = `random_malformed_string`;
      const shouldSendRerpot = telemetrySender['shouldSendReport']();
      expect(shouldSendRerpot).toBe(true);
    });

    describe('sendIfDue', () => {
      let originalFetch: typeof window['fetch'];
      let mockFetch: jest.Mock<typeof window['fetch']>;

      beforeAll(() => {
        originalFetch = window.fetch;
      });

      // @ts-ignore
      beforeEach(() => (window.fetch = mockFetch = jest.fn()));
      // @ts-ignore
      afterAll(() => (window.fetch = originalFetch));

      it('does not send if already sending', async () => {
        const telemetryService = mockTelemetryService();
        const telemetrySender = new TelemetrySender(telemetryService);
        telemetrySender['shouldSendReport'] = jest.fn();
        telemetrySender['isSending'] = true;
        await telemetrySender['sendIfDue']();

        expect(telemetrySender['shouldSendReport']).toBeCalledTimes(0);
        expect(mockFetch).toBeCalledTimes(0);
      });

      it('does not send if shouldSendReport returns false', async () => {
        const telemetryService = mockTelemetryService();
        const telemetrySender = new TelemetrySender(telemetryService);
        telemetrySender['shouldSendReport'] = jest.fn().mockReturnValue(false);
        telemetrySender['isSending'] = false;
        await telemetrySender['sendIfDue']();

        expect(telemetrySender['shouldSendReport']).toBeCalledTimes(1);
        expect(mockFetch).toBeCalledTimes(0);
      });

      it('sends report if due', async () => {
        const mockTelemetryUrl = 'telemetry_cluster_url';
        const mockTelemetryPayload = ['hashed_cluster_usage_data1'];

        const telemetryService = mockTelemetryService();
        const telemetrySender = new TelemetrySender(telemetryService);
        telemetryService.getTelemetryUrl = jest.fn().mockReturnValue(mockTelemetryUrl);
        telemetryService.fetchTelemetry = jest.fn().mockReturnValue(mockTelemetryPayload);
        telemetrySender['shouldSendReport'] = jest.fn().mockReturnValue(true);
        telemetrySender['isSending'] = false;
        await telemetrySender['sendIfDue']();

        expect(telemetryService.fetchTelemetry).toBeCalledTimes(1);
        expect(mockFetch).toBeCalledTimes(1);
        expect(mockFetch).toBeCalledWith(mockTelemetryUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: mockTelemetryPayload[0],
        });
      });

      it('sends report separately for every cluster', async () => {
        const mockTelemetryUrl = 'telemetry_cluster_url';
        const mockTelemetryPayload = ['hashed_cluster_usage_data1', 'hashed_cluster_usage_data2'];

        const telemetryService = mockTelemetryService();
        const telemetrySender = new TelemetrySender(telemetryService);
        telemetryService.getTelemetryUrl = jest.fn().mockReturnValue(mockTelemetryUrl);
        telemetryService.fetchTelemetry = jest.fn().mockReturnValue(mockTelemetryPayload);
        telemetrySender['shouldSendReport'] = jest.fn().mockReturnValue(true);
        telemetrySender['isSending'] = false;
        await telemetrySender['sendIfDue']();

        expect(telemetryService.fetchTelemetry).toBeCalledTimes(1);
        expect(mockFetch).toBeCalledTimes(2);
      });

      it('updates last lastReported and calls saveToBrowser', async () => {
        const mockTelemetryUrl = 'telemetry_cluster_url';
        const mockTelemetryPayload = ['hashed_cluster_usage_data1'];

        const telemetryService = mockTelemetryService();
        const telemetrySender = new TelemetrySender(telemetryService);
        telemetryService.getTelemetryUrl = jest.fn().mockReturnValue(mockTelemetryUrl);
        telemetryService.fetchTelemetry = jest.fn().mockReturnValue(mockTelemetryPayload);
        telemetrySender['shouldSendReport'] = jest.fn().mockReturnValue(true);
        telemetrySender['saveToBrowser'] = jest.fn();

        await telemetrySender['sendIfDue']();

        expect(mockFetch).toBeCalledTimes(1);
        expect(telemetrySender['lastReported']).toBeDefined();
        expect(telemetrySender['saveToBrowser']).toBeCalledTimes(1);
        expect(telemetrySender['isSending']).toBe(false);
      });

      it('catches fetchTelemetry errors and sets isSending to false', async () => {
        const telemetryService = mockTelemetryService();
        const telemetrySender = new TelemetrySender(telemetryService);
        telemetryService.getTelemetryUrl = jest.fn();
        telemetryService.fetchTelemetry = jest.fn().mockImplementation(() => {
          throw Error('Error fetching usage');
        });
        await telemetrySender['sendIfDue']();
        expect(telemetryService.fetchTelemetry).toBeCalledTimes(1);
        expect(telemetrySender['lastReported']).toBeUndefined();
        expect(telemetrySender['isSending']).toBe(false);
      });

      it('catches fetch errors and sets isSending to false', async () => {
        const mockTelemetryPayload = ['hashed_cluster_usage_data1', 'hashed_cluster_usage_data2'];
        const telemetryService = mockTelemetryService();
        const telemetrySender = new TelemetrySender(telemetryService);
        telemetryService.getTelemetryUrl = jest.fn();
        telemetryService.fetchTelemetry = jest.fn().mockReturnValue(mockTelemetryPayload);
        mockFetch.mockImplementation(() => {
          throw Error('Error sending usage');
        });
        await telemetrySender['sendIfDue']();
        expect(telemetryService.fetchTelemetry).toBeCalledTimes(1);
        expect(mockFetch).toBeCalledTimes(2);
        expect(telemetrySender['lastReported']).toBeUndefined();
        expect(telemetrySender['isSending']).toBe(false);
      });
    });
  });
  describe('startChecking', () => {
    let originalSetInterval: typeof window['setInterval'];
    let mockSetInterval: jest.Mock<typeof window['setInterval']>;

    beforeAll(() => {
      originalSetInterval = window.setInterval;
    });

    // @ts-ignore
    beforeEach(() => (window.setInterval = mockSetInterval = jest.fn()));
    // @ts-ignore
    afterAll(() => (window.setInterval = originalSetInterval));

    it('calls sendIfDue every 60000 ms', () => {
      const telemetryService = mockTelemetryService();
      const telemetrySender = new TelemetrySender(telemetryService);
      telemetrySender.startChecking();
      expect(mockSetInterval).toBeCalledTimes(1);
      expect(mockSetInterval).toBeCalledWith(telemetrySender['sendIfDue'], 60000);
    });
  });
});
