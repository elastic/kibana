/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ThemeServiceSetup } from '@kbn/core-theme-browser';
import type { AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import type { ExecutionContextSetup } from '@kbn/core-execution-context-browser';
import type { HttpSetup } from '@kbn/core-http-browser';
import type { FatalErrorsSetup } from '@kbn/core-fatal-errors-browser';
import type { IUiSettingsClient, SettingsStart } from '@kbn/core-ui-settings-browser';
import type { NotificationsSetup } from '@kbn/core-notifications-browser';
import type { ApplicationSetup } from '@kbn/core-application-browser';
import type { CustomBrandingSetup } from '@kbn/core-custom-branding-browser';
import type { PluginsServiceSetup } from '@kbn/core-plugins-contracts-browser';
import type { SecurityServiceSetup } from '@kbn/core-security-browser';
import type { UserProfileServiceSetup } from '@kbn/core-user-profile-browser';
import type { CoreStart } from './core_start';

/**
 * Core services exposed to the `Plugin` setup lifecycle
 *
 * @typeParam TPluginsStart - the type of the consuming plugin's start dependencies. Should be the same
 *                            as the consuming {@link Plugin}'s `TPluginsStart` type. Used by `getStartServices`.
 * @typeParam TStart - the type of the consuming plugin's start contract. Should be the same as the
 *                     consuming {@link Plugin}'s `TStart` type. Used by `getStartServices`.
 *
 * @public
 *
 * @internalRemarks We document the properties with \@link tags to improve
 * navigation in the generated docs until there's a fix for
 * https://github.com/Microsoft/web-build-tools/issues/1237
 */
export interface CoreSetup<TPluginsStart extends object = object, TStart = unknown> {
  /** {@link AnalyticsServiceSetup} */
  analytics: AnalyticsServiceSetup;
  /** {@link ApplicationSetup} */
  application: ApplicationSetup;
  /** {@link CustomBrandingSetup} */
  customBranding: CustomBrandingSetup;
  /** {@link FatalErrorsSetup} */
  fatalErrors: FatalErrorsSetup;
  /** {@link HttpSetup} */
  http: HttpSetup;
  /** {@link NotificationsSetup} */
  notifications: NotificationsSetup;
  /** {@link IUiSettingsClient} */
  /** @Deprecated Use {@link CoreSetup.settings} instead */
  uiSettings: IUiSettingsClient;
  /** {@link SettingsStart} */
  settings: SettingsStart;
  /** {@link ExecutionContextSetup} */
  executionContext: ExecutionContextSetup;
  /** {@link ThemeServiceSetup} */
  theme: ThemeServiceSetup;
  /** {@link PluginsServiceSetup} */
  plugins: PluginsServiceSetup;
  /** {@link SecurityServiceSetup} */
  security: SecurityServiceSetup;
  /** {@link UserProfileServiceSetup} */
  userProfile: UserProfileServiceSetup;
  /** {@link StartServicesAccessor} */
  getStartServices: StartServicesAccessor<TPluginsStart, TStart>;
}

/**
 * Allows plugins to get access to APIs available in start inside async
 * handlers, such as {@link App.mount}. Promise will not resolve until Core
 * and plugin dependencies have completed `start`.
 *
 * @public
 */
export type StartServicesAccessor<
  TPluginsStart extends object = object,
  TStart = unknown
> = () => Promise<[CoreStart, TPluginsStart, TStart]>;
