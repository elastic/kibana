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

import {
  injectedMetadataServiceMock,
  notificationServiceMock,
  overlayServiceMock,
} from '../../../../../core/public/mocks';
const injectedMetadataMock = injectedMetadataServiceMock.createStartContract();

export function mockInjectedMetadata({ telemetryOptedIn, allowChangingOptInStatus, telemetryNotifyUserAboutOptInDefault }) {
  const mockGetInjectedVar = jest.fn().mockImplementation((key) => {
    switch (key) {
      case 'telemetryOptedIn': return telemetryOptedIn;
      case 'allowChangingOptInStatus': return allowChangingOptInStatus;
      case 'telemetryNotifyUserAboutOptInDefault': return telemetryNotifyUserAboutOptInDefault;
      default: throw new Error(`unexpected injectedVar ${key}`);
    }
  });

  injectedMetadataMock.getInjectedVar = mockGetInjectedVar;
}

jest.doMock('ui/new_platform', () => ({
  npSetup: {
    core: {
      notifications: notificationServiceMock.createSetupContract(),
    }
  },
  npStart: {
    core: {
      injectedMetadata: injectedMetadataMock,
      overlays: overlayServiceMock.createStartContract(),
    },
  },
}));
