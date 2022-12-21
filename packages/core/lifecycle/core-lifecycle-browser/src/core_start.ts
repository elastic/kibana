/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { ThemeServiceStart } from '@kbn/core-theme-browser';
import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { ExecutionContextStart } from '@kbn/core-execution-context-browser';
import type { HttpStart } from '@kbn/core-http-browser';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { FatalErrorsStart } from '@kbn/core-fatal-errors-browser';
import type { IUiSettingsClient, SettingsStart } from '@kbn/core-ui-settings-browser';
import type { DeprecationsServiceStart } from '@kbn/core-deprecations-browser';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import type { SavedObjectsStart } from '@kbn/core-saved-objects-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { ChromeStart } from '@kbn/core-chrome-browser';

/**
 * Core services exposed to the `Plugin` start lifecycle
 *
 * @public
 *
 * @internalRemarks We document the properties with \@link tags to improve
 * navigation in the generated docs until there's a fix for
 * https://github.com/Microsoft/web-build-tools/issues/1237
 */
export interface CoreStart {
  /** {@link AnalyticsServiceStart} */
  analytics: AnalyticsServiceStart;
  /** {@link ApplicationStart} */
  application: ApplicationStart;
  /** {@link ChromeStart} */
  chrome: ChromeStart;
  /** {@link DocLinksStart} */
  docLinks: DocLinksStart;
  /** {@link ExecutionContextStart} */
  executionContext: ExecutionContextStart;
  /** {@link HttpStart} */
  http: HttpStart;
  /** {@link SavedObjectsStart} */
  savedObjects: SavedObjectsStart;
  /** {@link I18nStart} */
  i18n: I18nStart;
  /** {@link NotificationsStart} */
  notifications: NotificationsStart;
  /** {@link OverlayStart} */
  overlays: OverlayStart;
  /** {@link IUiSettingsClient} */
  /** @Deprecated Use {@link CoreStart.settings} instead */
  uiSettings: IUiSettingsClient;
  /** {@link SettingsStart} */
  settings: SettingsStart;
  /** {@link FatalErrorsStart} */
  fatalErrors: FatalErrorsStart;
  /** {@link DeprecationsServiceStart} */
  deprecations: DeprecationsServiceStart;
  /** {@link ThemeServiceStart} */
  theme: ThemeServiceStart;
}
