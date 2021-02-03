/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/* eslint-disable dot-notation */
import { mockTelemetryNotifications, mockTelemetryService } from '../../mocks';

describe('onSetOptInClick', () => {
  it('sets setting successfully and removes banner', async () => {
    const optIn = true;
    const bannerId = 'bruce-banner';

    const telemetryService = mockTelemetryService();
    telemetryService.setOptIn = jest.fn();
    const telemetryNotifications = mockTelemetryNotifications({ telemetryService });
    telemetryNotifications['optInBannerId'] = bannerId;

    await telemetryNotifications['onSetOptInClick'](optIn);
    expect(telemetryNotifications['overlays'].banners.remove).toBeCalledTimes(1);
    expect(telemetryNotifications['overlays'].banners.remove).toBeCalledWith(bannerId);
    expect(telemetryService.setOptIn).toBeCalledTimes(1);
    expect(telemetryService.setOptIn).toBeCalledWith(optIn);
  });
});

describe('setOptedInNoticeSeen', () => {
  it('sets setting successfully and removes banner', async () => {
    const bannerId = 'bruce-banner';

    const telemetryService = mockTelemetryService();
    telemetryService.setUserHasSeenNotice = jest.fn();
    const telemetryNotifications = mockTelemetryNotifications({ telemetryService });
    telemetryNotifications['optedInNoticeBannerId'] = bannerId;
    await telemetryNotifications.setOptedInNoticeSeen();

    expect(telemetryNotifications['overlays'].banners.remove).toBeCalledTimes(1);
    expect(telemetryNotifications['overlays'].banners.remove).toBeCalledWith(bannerId);
    expect(telemetryService.setUserHasSeenNotice).toBeCalledTimes(1);
  });
});

describe('shouldShowOptedInNoticeBanner', () => {
  it("should return true because a banner hasn't been shown, the notice hasn't been seen and the user has privileges to edit saved objects", () => {
    const telemetryService = mockTelemetryService();
    telemetryService.getUserShouldSeeOptInNotice = jest.fn().mockReturnValue(true);
    const telemetryNotifications = mockTelemetryNotifications({ telemetryService });
    expect(telemetryNotifications.shouldShowOptedInNoticeBanner()).toBe(true);
  });

  it('should return false because the banner is already on screen', () => {
    const telemetryService = mockTelemetryService();
    telemetryService.getUserShouldSeeOptInNotice = jest.fn().mockReturnValue(true);
    const telemetryNotifications = mockTelemetryNotifications({ telemetryService });
    telemetryNotifications['optedInNoticeBannerId'] = 'bruce-banner';
    expect(telemetryNotifications.shouldShowOptedInNoticeBanner()).toBe(false);
  });

  it("should return false because the banner has already been seen or the user doesn't have privileges to change saved objects", () => {
    const telemetryService = mockTelemetryService();
    telemetryService.getUserShouldSeeOptInNotice = jest.fn().mockReturnValue(false);
    const telemetryNotifications = mockTelemetryNotifications({ telemetryService });
    expect(telemetryNotifications.shouldShowOptedInNoticeBanner()).toBe(false);
  });
});
