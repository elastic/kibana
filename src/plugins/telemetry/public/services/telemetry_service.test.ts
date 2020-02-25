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
import { mockTelemetryService } from '../mocks';

const mockSubtract = jest.fn().mockImplementation(() => {
  return {
    toISOString: jest.fn(),
  };
});

jest.mock('moment', () => {
  return jest.fn().mockImplementation(() => {
    return {
      subtract: mockSubtract,
      toISOString: jest.fn(),
    };
  });
});

describe('TelemetryService', () => {
  describe('fetchTelemetry', () => {
    it('calls expected URL with 20 minutes - now', async () => {
      const telemetryService = mockTelemetryService();
      await telemetryService.fetchTelemetry();
      expect(telemetryService['http'].post).toBeCalledWith('/api/telemetry/v2/clusters/_stats', {
        body: JSON.stringify({ unencrypted: false, timeRange: {} }),
      });
      expect(mockSubtract).toBeCalledWith(20, 'minutes');
    });
  });

  describe('fetchExample', () => {
    it('calls fetchTelemetry with unencrupted: true', async () => {
      const telemetryService = mockTelemetryService();
      telemetryService.fetchTelemetry = jest.fn();
      await telemetryService.fetchExample();
      expect(telemetryService.fetchTelemetry).toBeCalledWith({ unencrypted: true });
    });
  });

  describe('setOptIn', () => {
    it('calls api if canChangeOptInStatus', async () => {
      const telemetryService = mockTelemetryService({ reportOptInStatusChange: false });
      telemetryService.getCanChangeOptInStatus = jest.fn().mockReturnValue(true);
      await telemetryService.setOptIn(true);

      expect(telemetryService['http'].post).toBeCalledTimes(1);
    });

    it('sends enabled true if optedIn: true', async () => {
      const telemetryService = mockTelemetryService({ reportOptInStatusChange: false });
      telemetryService.getCanChangeOptInStatus = jest.fn().mockReturnValue(true);
      const optedIn = true;
      await telemetryService.setOptIn(optedIn);

      expect(telemetryService['http'].post).toBeCalledWith('/api/telemetry/v2/optIn', {
        body: JSON.stringify({ enabled: optedIn }),
      });
    });

    it('sends enabled false if optedIn: false', async () => {
      const telemetryService = mockTelemetryService({ reportOptInStatusChange: false });
      telemetryService.getCanChangeOptInStatus = jest.fn().mockReturnValue(true);
      const optedIn = false;
      await telemetryService.setOptIn(optedIn);

      expect(telemetryService['http'].post).toBeCalledWith('/api/telemetry/v2/optIn', {
        body: JSON.stringify({ enabled: optedIn }),
      });
    });

    it('does not call reportOptInStatus if reportOptInStatusChange is false', async () => {
      const telemetryService = mockTelemetryService({ reportOptInStatusChange: false });
      telemetryService.getCanChangeOptInStatus = jest.fn().mockReturnValue(true);
      telemetryService['reportOptInStatus'] = jest.fn();
      await telemetryService.setOptIn(true);

      expect(telemetryService['reportOptInStatus']).toBeCalledTimes(0);
      expect(telemetryService['http'].post).toBeCalledTimes(1);
    });

    it('calls reportOptInStatus if reportOptInStatusChange is true', async () => {
      const telemetryService = mockTelemetryService({ reportOptInStatusChange: true });
      telemetryService.getCanChangeOptInStatus = jest.fn().mockReturnValue(true);
      telemetryService['reportOptInStatus'] = jest.fn();
      await telemetryService.setOptIn(true);

      expect(telemetryService['reportOptInStatus']).toBeCalledTimes(1);
      expect(telemetryService['http'].post).toBeCalledTimes(1);
    });

    it('adds an error toast on api error', async () => {
      const telemetryService = mockTelemetryService({ reportOptInStatusChange: false });
      telemetryService.getCanChangeOptInStatus = jest.fn().mockReturnValue(true);
      telemetryService['reportOptInStatus'] = jest.fn();
      telemetryService['http'].post = jest.fn().mockImplementation((url: string) => {
        if (url === '/api/telemetry/v2/optIn') {
          throw Error('failed to update opt in.');
        }
      });

      await telemetryService.setOptIn(true);
      expect(telemetryService['http'].post).toBeCalledTimes(1);
      expect(telemetryService['reportOptInStatus']).toBeCalledTimes(0);
      expect(telemetryService['notifications'].toasts.addError).toBeCalledTimes(1);
    });

    it('adds an error toast on reportOptInStatus error', async () => {
      const telemetryService = mockTelemetryService({ reportOptInStatusChange: true });
      telemetryService.getCanChangeOptInStatus = jest.fn().mockReturnValue(true);
      telemetryService['reportOptInStatus'] = jest.fn().mockImplementation(() => {
        throw Error('failed to report OptIn Status.');
      });

      await telemetryService.setOptIn(true);
      expect(telemetryService['http'].post).toBeCalledTimes(1);
      expect(telemetryService['reportOptInStatus']).toBeCalledTimes(1);
      expect(telemetryService['notifications'].toasts.addError).toBeCalledTimes(1);
    });
  });
});
