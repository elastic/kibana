/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type { History } from 'history';
import type { MountPoint } from '@kbn/core-mount-utils-browser';
import type { PluginOpaqueId } from '@kbn/core-base-common';
import type {
  App,
  AppMount,
  ApplicationSetup,
  ApplicationStart,
} from '@kbn/core-application-browser';

/** @internal */
export interface Mounter {
  appRoute: string;
  appBasePath: string;
  mount: AppMount;
  exactRoute: boolean;
  unmountBeforeMounting?: boolean;
}

/** @internal */
export interface ParsedAppUrl {
  app: string;
  path?: string;
}

/** @internal */
export interface InternalApplicationSetup extends Pick<ApplicationSetup, 'registerAppUpdater'> {
  /**
   * Register an mountable application to the system.
   * @param plugin - opaque ID of the plugin that registers this application
   * @param app
   */
  register<HistoryLocationState = unknown>(
    plugin: PluginOpaqueId,
    app: App<HistoryLocationState>
  ): void;
}

/**
 * Ownership and deep-link metadata for a single registered application.
 * Used by Core's dev/test-only navigation-dependency snapshot to attribute cross-plugin
 * navigation references to the plugin that owns the target application.
 *
 * @internal
 */
export interface RegisteredAppInfo {
  /** The registered application id. */
  appId: string;
  /** Opaque id of the plugin (or Core) that registered the application. */
  owner: PluginOpaqueId;
  /** Ids of the application's (nested) deep links that resolve to a path. */
  deepLinkIds: string[];
}

/** @internal */
export interface InternalApplicationStart extends ApplicationStart {
  // Internal APIs
  getComponent(): JSX.Element | null;

  /**
   * Returns ownership and deep-link metadata for every registered application, unfiltered by
   * capabilities. Used by Core's dev/test-only navigation-dependency snapshot (see
   * https://github.com/elastic/kibana/issues/66682).
   *
   * @internal
   */
  getRegisteredAppsInfo(): RegisteredAppInfo[];

  /**
   * Emits true when the current location resolves to App Not Found (missing or inaccessible
   * application). Stays false for routes outside application routing.
   * Used by chrome visibility so navigation remains available as a recovery surface.
   *
   * @internal
   */
  appNotFound$: Observable<boolean>;

  /**
   * The potential action menu set by the currently mounted app.
   * Consumed by the chrome header.
   *
   * @internal
   */
  currentActionMenu$: Observable<MountPoint | undefined>;

  /**
   * The global history instance, exposed only to Core.
   * @internal
   */
  history: History<unknown>;
}
