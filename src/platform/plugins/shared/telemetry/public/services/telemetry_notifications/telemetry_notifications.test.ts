/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable dot-notation */
import { mockTelemetryNotifications, mockTelemetryService } from '../../mocks';

describe('setOptedInNoticeSeen', () => {
  it('sets setting successfully and removes banner', async () => {
    const bannerId = 'bruce-banner';

    const telemetryService = mockTelemetryService();
    telemetryService.setUserHasSeenNotice = jest.fn();
    const telemetryNotifications = mockTelemetryNotifications({ telemetryService });
    telemetryNotifications['optInStatusNoticeBannerId'] = bannerId;
    await telemetryNotifications.setOptInStatusNoticeSeen();

    expect(telemetryNotifications['overlays'].banners.remove).toBeCalledTimes(1);
    expect(telemetryNotifications['overlays'].banners.remove).toBeCalledWith(bannerId);
    expect(telemetryService.setUserHasSeenNotice).toBeCalledTimes(1);
  });
});

describe('shouldShowOptedInNoticeBanner', () => {
  describe(`when the banner isn't visible yet`, () => {
    const telemetryService = mockTelemetryService();
    const getUserShouldSeeOptInNotice = jest.fn();
    telemetryService.getUserShouldSeeOptInNotice = getUserShouldSeeOptInNotice;
    const telemetryNotifications = mockTelemetryNotifications({ telemetryService });

    it('should return true when `telemetryService.getUserShouldSeeOptInNotice returns true', () => {
      getUserShouldSeeOptInNotice.mockReturnValue(true);
      expect(telemetryNotifications.shouldShowOptInStatusNoticeBanner()).toBe(true);
    });

    it('should return false when `telemetryService.getUserShouldSeeOptInNotice returns false', () => {
      getUserShouldSeeOptInNotice.mockReturnValue(false);
      expect(telemetryNotifications.shouldShowOptInStatusNoticeBanner()).toBe(false);
    });
  });

  describe(`when the banner is already visible`, () => {
    const telemetryService = mockTelemetryService();
    const getUserShouldSeeOptInNotice = jest.fn();
    telemetryService.getUserShouldSeeOptInNotice = getUserShouldSeeOptInNotice;
    const telemetryNotifications = mockTelemetryNotifications({ telemetryService });
    telemetryNotifications['optInStatusNoticeBannerId'] = 'bruce-banner';

    it('should return false when `telemetryService.getUserShouldSeeOptInNotice` returns true', () => {
      getUserShouldSeeOptInNotice.mockReturnValue(true);
      expect(telemetryNotifications.shouldShowOptInStatusNoticeBanner()).toBe(false);
    });

    it('should return false when `telemetryService.getUserShouldSeeOptInNotice returns false', () => {
      getUserShouldSeeOptInNotice.mockReturnValue(false);
      expect(telemetryNotifications.shouldShowOptInStatusNoticeBanner()).toBe(false);
    });
  });
});
