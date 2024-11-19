/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  overlayServiceMock,
  analyticsServiceMock,
  httpServiceMock,
  i18nServiceMock,
  notificationServiceMock,
  themeServiceMock,
} from '@kbn/core/public/mocks';
import type { TelemetryConstants } from '.';
import type { TelemetryPluginStart, TelemetryPluginSetup, TelemetryPluginConfig } from './plugin';
import { TelemetryService, TelemetryNotifications } from './services';

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
    sendUsageTo: 'staging' as const,
    sendUsageFrom: 'browser' as const,
    optIn: true,
    banner: true,
    allowChangingOptInStatus: true,
    appendServerlessChannelsSuffix: false,
    telemetryNotifyUserAboutOptInDefault: true,
    userCanChangeSettings: true,
    labels: {},
    ...configOverride,
  };

  const telemetryService = new TelemetryService({
    config,
    http: httpServiceMock.createStartContract(),
    notifications: notificationServiceMock.createSetupContract(),
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
    analytics: analyticsServiceMock.createAnalyticsServiceStart(),
    i18n: i18nServiceMock.createStartContract(),
    theme: themeServiceMock.createStartContract(),
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
  const telemetryConstants = mockTelemetryConstants();

  const startContract: Start = {
    telemetryService,
    telemetryNotifications: {
      setOptedInNoticeSeen: jest.fn(),
    },
    telemetryConstants,
  };

  return startContract;
}
