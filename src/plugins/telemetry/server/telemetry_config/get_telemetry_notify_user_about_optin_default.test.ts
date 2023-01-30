/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getNotifyUserAboutOptInDefault } from './get_telemetry_notify_user_about_optin_default';

describe('getNotifyUserAboutOptInDefault: get a flag that describes if the user must be notified about optin default', () => {
  it('should return true when kibana has fresh defaults', () => {
    expect(
      getNotifyUserAboutOptInDefault({
        allowChangingOptInStatus: true,
        telemetrySavedObject: { userHasSeenNotice: false },
        telemetryOptedIn: true,
        configTelemetryOptIn: true,
      })
    ).toBe(true);
  });

  it('should return false if allowChangingOptInStatus = false', () => {
    expect(
      getNotifyUserAboutOptInDefault({
        allowChangingOptInStatus: false,
        telemetrySavedObject: {},
        telemetryOptedIn: false,
        configTelemetryOptIn: false,
      })
    ).toBe(false);

    expect(
      getNotifyUserAboutOptInDefault({
        allowChangingOptInStatus: false,
        telemetrySavedObject: {},
        telemetryOptedIn: true,
        configTelemetryOptIn: true,
      })
    ).toBe(false);
  });

  it('should return false if user has seen notice', () => {
    expect(
      getNotifyUserAboutOptInDefault({
        allowChangingOptInStatus: true,
        telemetrySavedObject: { userHasSeenNotice: true },
        telemetryOptedIn: false,
        configTelemetryOptIn: false,
      })
    ).toBe(false);

    expect(
      getNotifyUserAboutOptInDefault({
        allowChangingOptInStatus: true,
        telemetrySavedObject: { userHasSeenNotice: true },
        telemetryOptedIn: true,
        configTelemetryOptIn: true,
      })
    ).toBe(false);
  });

  it('should return false if user is opted out', () => {
    expect(
      getNotifyUserAboutOptInDefault({
        allowChangingOptInStatus: true,
        telemetrySavedObject: { userHasSeenNotice: false },
        telemetryOptedIn: false,
        configTelemetryOptIn: true,
      })
    ).toBe(false);

    expect(
      getNotifyUserAboutOptInDefault({
        allowChangingOptInStatus: true,
        telemetrySavedObject: { userHasSeenNotice: false },
        telemetryOptedIn: false,
        configTelemetryOptIn: false,
      })
    ).toBe(false);
  });

  it('should return false if kibana is opted out via config', () => {
    expect(
      getNotifyUserAboutOptInDefault({
        allowChangingOptInStatus: true,
        telemetrySavedObject: { userHasSeenNotice: false },
        telemetryOptedIn: true,
        configTelemetryOptIn: false,
      })
    ).toBe(false);
  });
});
