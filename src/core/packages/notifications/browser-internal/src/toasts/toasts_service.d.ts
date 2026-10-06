/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnalyticsServiceStart, AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import type { RenderingService } from '@kbn/core-rendering-browser';
import type { NotificationCoordinator } from '@kbn/core-notifications-browser';
import type { ToastsApi } from './toasts_api';
interface SetupDeps {
  analytics: AnalyticsServiceSetup;
  uiSettings: IUiSettingsClient;
}
interface StartDeps {
  overlays: OverlayStart;
  rendering: RenderingService;
  analytics: AnalyticsServiceStart;
  targetDomElement: HTMLElement;
  notificationCoordinator: NotificationCoordinator;
}
export declare class ToastsService {
  private api?;
  private targetDomElement?;
  private readonly telemetry;
  setup({ uiSettings, analytics }: SetupDeps): ToastsApi;
  start({
    overlays,
    targetDomElement,
    rendering,
    analytics,
    notificationCoordinator,
  }: StartDeps): ToastsApi;
  stop(): void;
}
export {};
