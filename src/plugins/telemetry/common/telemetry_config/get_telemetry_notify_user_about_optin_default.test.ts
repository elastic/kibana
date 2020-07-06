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
        telemetrySavedObject: null,
        telemetryOptedIn: false,
        configTelemetryOptIn: false,
      })
    ).toBe(false);

    expect(
      getNotifyUserAboutOptInDefault({
        allowChangingOptInStatus: false,
        telemetrySavedObject: null,
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
