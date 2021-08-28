/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { ApplicationSetup, ApplicationStart } from './application/types';
import type { ChromeStart } from './chrome/types';
import type { DeprecationsServiceStart } from './deprecations/deprecations_service';
import type { DocLinksStart } from './doc_links/doc_links_service';
import type { FatalErrorsSetup, FatalErrorsStart } from './fatal_errors/fatal_errors_service';
import type { HttpSetup, HttpStart } from './http/types';
import type { I18nStart } from './i18n/i18n_service';
import type { NotificationsSetup, NotificationsStart } from './notifications/notifications_service';
import type { OverlayStart } from './overlays/overlay_service';
import type { SavedObjectsStart } from './saved_objects/saved_objects_service';
import type { IUiSettingsClient } from './ui_settings/types';

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
  /** {@link ApplicationSetup} */
  application: ApplicationSetup;
  /** {@link FatalErrorsSetup} */
  fatalErrors: FatalErrorsSetup;
  /** {@link HttpSetup} */
  http: HttpSetup;
  /** {@link NotificationsSetup} */
  notifications: NotificationsSetup;
  /** {@link IUiSettingsClient} */
  uiSettings: IUiSettingsClient;
  /**
   * exposed temporarily until https://github.com/elastic/kibana/issues/41990 done
   * use *only* to retrieve config values. There is no way to set injected values
   * in the new platform.
   * @deprecated
   * */
  injectedMetadata: {
    getInjectedVar: (name: string, defaultValue?: any) => unknown;
  };
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
  /** {@link ApplicationStart} */
  application: ApplicationStart;
  /** {@link ChromeStart} */
  chrome: ChromeStart;
  /** {@link DocLinksStart} */
  docLinks: DocLinksStart;
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
  uiSettings: IUiSettingsClient;
  /** {@link FatalErrorsStart} */
  fatalErrors: FatalErrorsStart;
  /** {@link DeprecationsServiceStart} */
  deprecations: DeprecationsServiceStart;
  /**
   * exposed temporarily until https://github.com/elastic/kibana/issues/41990 done
   * use *only* to retrieve config values. There is no way to set injected values
   * in the new platform.
   * @deprecated
   * */
  injectedMetadata: {
    getInjectedVar: (name: string, defaultValue?: any) => unknown;
  };
}
