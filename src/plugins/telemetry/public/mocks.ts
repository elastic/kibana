/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  overlayServiceMock,
  httpServiceMock,
  notificationServiceMock,
} from '@kbn/core/public/mocks';
import { TelemetryService } from './services/telemetry_service';
import { TelemetryNotifications } from './services/telemetry_notifications/telemetry_notifications';
import { TelemetryPluginStart, TelemetryPluginSetup, TelemetryPluginConfig } from './plugin';
import { TelemetryConstants } from '.';

// The following is to be able to access private methods
/* eslint-disable dot-notation */

export interface TelemetryServiceMockOptions {
  reportOptInStatusChange?: boolean;
  currentKibanaVersion?: string;
  isScreenshotMode?: boolean;
  config?: Partial<TelemetryPluginConfig>;
}

export function mockTelemetryService({
  reportOptInStatusChange,
  currentKibanaVersion = 'mockKibanaVersion',
  isScreenshotMode = false,
  config: configOverride = {},
}: TelemetryServiceMockOptions = {}) {
  const config = {
    enabled: true,
    sendUsageTo: 'staging' as const,
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
    isScreenshotMode,
    currentKibanaVersion,
    reportOptInStatusChange,
  });

  const originalReportOptInStatus = telemetryService['reportOptInStatus'];
  telemetryService['reportOptInStatus'] = jest.fn().mockImplementation((optInPayload) => {
    return originalReportOptInStatus(optInPayload); // Actually calling the original method
  });

  return telemetryService;
}

export function mockTelemetryConstants(): TelemetryConstants {
  return {
    getPrivacyStatementUrl: () => 'https://some-host/some-url',
  };
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
    telemetryConstants: mockTelemetryConstants(),
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
  const telemetryConstants = mockTelemetryConstants();

  const startContract: Start = {
    telemetryService,
    telemetryNotifications,
    telemetryConstants,
  };

  return startContract;
}
