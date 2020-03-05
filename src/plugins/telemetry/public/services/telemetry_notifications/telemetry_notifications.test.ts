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
