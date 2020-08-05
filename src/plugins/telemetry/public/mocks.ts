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
import { TelemetryService } from './services/telemetry_service';
import { TelemetryNotifications } from './services/telemetry_notifications/telemetry_notifications';
import { TelemetryPluginStart, TelemetryPluginSetup, TelemetryPluginConfig } from './plugin';

// The following is to be able to access private methods
/* eslint-disable dot-notation */

export interface TelemetryServiceMockOptions {
  reportOptInStatusChange?: boolean;
  config?: Partial<TelemetryPluginConfig>;
}

export function mockTelemetryService({
  reportOptInStatusChange,
  config: configOverride = {},
}: TelemetryServiceMockOptions = {}) {
  const config = {
    enabled: true,
    url: 'http://localhost',
    optInStatusUrl: 'http://localhost',
    sendUsageFrom: 'browser' as const,
    optIn: true,
    banner: true,
    allowChangingOptInStatus: true,
    telemetryNotifyUserAboutOptInDefault: true,
    ...configOverride,
  };

  const telemetryService = new TelemetryService({
    config,
    http: httpServiceMock.createStartContract(),
    notifications: notificationServiceMock.createStartContract(),
    reportOptInStatusChange,
  });

  const originalReportOptInStatus = telemetryService['reportOptInStatus'];
  telemetryService['reportOptInStatus'] = jest.fn().mockImplementation((optInPayload) => {
    return originalReportOptInStatus(optInPayload); // Actually calling the original method
  });

  return telemetryService;
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

export type Setup = jest.Mocked<TelemetryPluginSetup>;
export type Start = jest.Mocked<TelemetryPluginStart>;

export const telemetryPluginMock = {
  createSetupContract,
  createStartContract,
};

function createSetupContract(): Setup {
  const telemetryService = mockTelemetryService();

  const setupContract: Setup = {
    telemetryService,
  };

  return setupContract;
}

function createStartContract(): Start {
  const telemetryService = mockTelemetryService();
  const telemetryNotifications = mockTelemetryNotifications({ telemetryService });

  const startContract: Start = {
    telemetryService,
    telemetryNotifications,
    telemetryConstants: {
      getPrivacyStatementUrl: jest.fn(),
    },
  };

  return startContract;
}
