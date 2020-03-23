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

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { overlayServiceMock } from '../../../core/public/overlays/overlay_service.mock';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { httpServiceMock } from '../../../core/public/http/http_service.mock';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { notificationServiceMock } from '../../../core/public/notifications/notifications_service.mock';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { injectedMetadataServiceMock } from '../../../core/public/injected_metadata/injected_metadata_service.mock';
import { TelemetryService } from './services/telemetry_service';
import { TelemetryNotifications } from './services/telemetry_notifications/telemetry_notifications';
import { TelemetryPluginStart } from './plugin';

export function mockTelemetryService({
  reportOptInStatusChange,
}: { reportOptInStatusChange?: boolean } = {}) {
  const injectedMetadata = injectedMetadataServiceMock.createStartContract();
  injectedMetadata.getInjectedVar.mockImplementation((key: string) => {
    switch (key) {
      case 'telemetryNotifyUserAboutOptInDefault':
        return true;
      case 'allowChangingOptInStatus':
        return true;
      case 'telemetryOptedIn':
        return true;
      default: {
        throw Error(`Unhandled getInjectedVar key "${key}".`);
      }
    }
  });

  return new TelemetryService({
    injectedMetadata,
    http: httpServiceMock.createStartContract(),
    notifications: notificationServiceMock.createStartContract(),
    reportOptInStatusChange,
  });
}

export function mockTelemetryNotifications({
  telemetryService,
}: {
  telemetryService: TelemetryService;
}) {
  return new TelemetryNotifications({
    overlays: overlayServiceMock.createStartContract(),
    telemetryService,
  });
}

export type Setup = jest.Mocked<TelemetryPluginStart>;

export const telemetryPluginMock = {
  createSetupContract,
};

function createSetupContract(): Setup {
  const telemetryService = mockTelemetryService();
  const telemetryNotifications = mockTelemetryNotifications({ telemetryService });

  const setupContract: Setup = {
    telemetryService,
    telemetryNotifications,
  };

  return setupContract;
}
