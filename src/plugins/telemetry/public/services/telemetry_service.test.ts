/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// ESLint disabled dot-notation we can access the private key telemetryService['http']
/* eslint-disable dot-notation */

import { mockTelemetryService } from '../mocks';

describe('TelemetryService', () => {
  describe('fetchTelemetry', () => {
    it('calls expected URL with 20 minutes - now', async () => {
      const telemetryService = mockTelemetryService();

      await telemetryService.fetchTelemetry();
      expect(telemetryService['http'].post).toBeCalledWith('/api/telemetry/v2/clusters/_stats', {
        body: JSON.stringify({ unencrypted: false }),
      });
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
    it('does not call the api if canChangeOptInStatus==false', async () => {
      const telemetryService = mockTelemetryService({
        reportOptInStatusChange: false,
        config: { allowChangingOptInStatus: false },
      });
      expect(await telemetryService.setOptIn(true)).toBe(false);

      expect(telemetryService['http'].post).toBeCalledTimes(0);
    });

    it('calls api if canChangeOptInStatus', async () => {
      const telemetryService = mockTelemetryService({
        reportOptInStatusChange: false,
        config: { allowChangingOptInStatus: true },
      });
      await telemetryService.setOptIn(true);

      expect(telemetryService['http'].post).toBeCalledTimes(1);
    });

    it('sends enabled true if optedIn: true', async () => {
      const telemetryService = mockTelemetryService({
        reportOptInStatusChange: false,
        config: { allowChangingOptInStatus: true },
      });
      const optedIn = true;
      await telemetryService.setOptIn(optedIn);

      expect(telemetryService['http'].post).toBeCalledWith('/api/telemetry/v2/optIn', {
        body: JSON.stringify({ enabled: optedIn }),
      });
    });

    it('sends enabled false if optedIn: false', async () => {
      const telemetryService = mockTelemetryService({
        reportOptInStatusChange: false,
        config: { allowChangingOptInStatus: true },
      });
      const optedIn = false;
      await telemetryService.setOptIn(optedIn);

      expect(telemetryService['http'].post).toBeCalledWith('/api/telemetry/v2/optIn', {
        body: JSON.stringify({ enabled: optedIn }),
      });
    });

    it('does not call reportOptInStatus if reportOptInStatusChange is false', async () => {
      const telemetryService = mockTelemetryService({
        reportOptInStatusChange: false,
        config: { allowChangingOptInStatus: true },
      });
      await telemetryService.setOptIn(true);

      expect(telemetryService['reportOptInStatus']).toBeCalledTimes(0);
      expect(telemetryService['http'].post).toBeCalledTimes(1);
    });

    it('calls reportOptInStatus if reportOptInStatusChange is true', async () => {
      const telemetryService = mockTelemetryService({
        reportOptInStatusChange: true,
        config: { allowChangingOptInStatus: true },
      });
      await telemetryService.setOptIn(true);

      expect(telemetryService['reportOptInStatus']).toBeCalledTimes(1);
      expect(telemetryService['http'].post).toBeCalledTimes(1);
    });

    it('adds an error toast on api error', async () => {
      const telemetryService = mockTelemetryService({
        reportOptInStatusChange: false,
        config: { allowChangingOptInStatus: true },
      });
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

    // This one should not happen because the entire method is fully caught but hey! :)
    it('adds an error toast on reportOptInStatus error', async () => {
      const telemetryService = mockTelemetryService({
        reportOptInStatusChange: true,
        config: { allowChangingOptInStatus: true },
      });

      telemetryService['reportOptInStatus'] = jest.fn().mockImplementation(() => {
        throw Error('failed to report OptIn Status.');
      });

      await telemetryService.setOptIn(true);
      expect(telemetryService['http'].post).toBeCalledTimes(1);
      expect(telemetryService['reportOptInStatus']).toBeCalledTimes(1);
      expect(telemetryService['notifications'].toasts.addError).toBeCalledTimes(1);
    });
  });

  describe('getTelemetryUrl', () => {
    it('should return the config.url parameter', async () => {
      const url = 'http://test.com';
      const telemetryService = mockTelemetryService({
        config: { url },
      });

      expect(telemetryService.getTelemetryUrl()).toBe(url);
    });
  });

  describe('setUserHasSeenNotice', () => {
    it('should hit the API and change the config', async () => {
      const telemetryService = mockTelemetryService({
        config: { telemetryNotifyUserAboutOptInDefault: undefined, userCanChangeSettings: true },
      });

      expect(telemetryService.userHasSeenOptedInNotice).toBe(undefined);
      expect(telemetryService.getUserShouldSeeOptInNotice()).toBe(false);
      await telemetryService.setUserHasSeenNotice();
      expect(telemetryService['http'].put).toBeCalledTimes(1);
      expect(telemetryService.userHasSeenOptedInNotice).toBe(true);
      expect(telemetryService.getUserShouldSeeOptInNotice()).toBe(true);
    });

    it('should show a toast notification if the request fail', async () => {
      const telemetryService = mockTelemetryService({
        config: { telemetryNotifyUserAboutOptInDefault: undefined },
      });

      telemetryService['http'].put = jest.fn().mockImplementation((url: string) => {
        if (url === '/api/telemetry/v2/userHasSeenNotice') {
          throw Error('failed to update opt in.');
        }
      });

      expect(telemetryService.userHasSeenOptedInNotice).toBe(undefined);
      expect(telemetryService.getUserShouldSeeOptInNotice()).toBe(false);
      await telemetryService.setUserHasSeenNotice();
      expect(telemetryService['http'].put).toBeCalledTimes(1);
      expect(telemetryService['notifications'].toasts.addError).toBeCalledTimes(1);
      expect(telemetryService.userHasSeenOptedInNotice).toBe(false);
      expect(telemetryService.getUserShouldSeeOptInNotice()).toBe(false);
    });
  });

  describe('getUserShouldSeeOptInNotice', () => {
    it('returns whether the user can update the telemetry config (has SavedObjects access)', () => {
      const telemetryService = mockTelemetryService({
        config: { userCanChangeSettings: undefined },
      });
      expect(telemetryService.config.userCanChangeSettings).toBe(undefined);
      expect(telemetryService.userCanChangeSettings).toBe(false);
      expect(telemetryService.getUserShouldSeeOptInNotice()).toBe(false);

      telemetryService.userCanChangeSettings = false;
      expect(telemetryService.config.userCanChangeSettings).toBe(false);
      expect(telemetryService.userCanChangeSettings).toBe(false);
      expect(telemetryService.getUserShouldSeeOptInNotice()).toBe(false);

      telemetryService.userCanChangeSettings = true;
      expect(telemetryService.config.userCanChangeSettings).toBe(true);
      expect(telemetryService.userCanChangeSettings).toBe(true);
      expect(telemetryService.getUserShouldSeeOptInNotice()).toBe(true);
    });
  });

  describe('reportOptInStatus', () => {
    let originalFetch: typeof window['fetch'];
    let mockFetch: jest.Mock<typeof window['fetch']>;

    beforeAll(() => {
      originalFetch = window.fetch;
    });

    // @ts-ignore
    beforeEach(() => (window.fetch = mockFetch = jest.fn()));
    // @ts-ignore
    afterAll(() => (window.fetch = originalFetch));

    it('reports opt-in status to telemetry url', async () => {
      const telemetryService = mockTelemetryService({
        config: { userCanChangeSettings: undefined },
      });
      const mockPayload = ['mock_hashed_opt_in_status_payload'];
      const mockUrl = 'mock_telemetry_optin_status_url';

      const mockGetOptInStatusUrl = jest.fn().mockReturnValue(mockUrl);
      telemetryService.getOptInStatusUrl = mockGetOptInStatusUrl;
      const result = await telemetryService['reportOptInStatus'](mockPayload);
      expect(result).toBeUndefined();
      expect(mockGetOptInStatusUrl).toBeCalledTimes(1);
      expect(mockFetch).toBeCalledTimes(1);

      expect(mockFetch).toBeCalledWith(mockUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Elastic-Stack-Version': 'mockKibanaVersion',
        },
        body: JSON.stringify(mockPayload),
      });
    });

    it('swallows errors if fetch fails', async () => {
      const telemetryService = mockTelemetryService({
        config: { userCanChangeSettings: undefined },
      });
      const mockPayload = ['mock_hashed_opt_in_status_payload'];
      const mockUrl = 'mock_telemetry_optin_status_url';

      const mockGetOptInStatusUrl = jest.fn().mockReturnValue(mockUrl);
      mockFetch.mockImplementation(() => {
        throw Error('Error sending usage');
      });

      telemetryService.getOptInStatusUrl = mockGetOptInStatusUrl;
      const result = await telemetryService['reportOptInStatus'](mockPayload);
      expect(result).toBeUndefined();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});
