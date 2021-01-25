/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
  currentKibanaVersion?: string;
  config?: Partial<TelemetryPluginConfig>;
}

export function mockTelemetryService({
  reportOptInStatusChange,
  currentKibanaVersion = 'mockKibanaVersion',
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
    userCanChangeSettings: true,
    ...configOverride,
  };

  const telemetryService = new TelemetryService({
    config,
    http: httpServiceMock.createStartContract(),
    notifications: notificationServiceMock.createStartContract(),
    currentKibanaVersion,
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
    http: httpServiceMock.createSetupContract(),
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
