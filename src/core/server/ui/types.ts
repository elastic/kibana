/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginName } from '../plugins';

/**
 * @internal
 */
export interface InternalUiServiceSetup {
  markAsRequired(pluginName: PluginName): void;
  markAsRequiredFor(pluginName: PluginName, ...pluginNames: PluginName[]): void;
  registerApp(pluginName: PluginName, routeId: string): void;
}

/**
 * @internal
 */
export interface InternalUiServiceStart {
  getPluginForApp(appId: string): PluginName;
}

/**
 * @public
 */
export interface UiServiceSetup {
  /**
   * Mark the plugin as being required on every ui application
   */
  markAsRequired(): void;

  /**
   * Mark the plugin as being required when loading given plugins.
   *
   * Used when some plugins are registering things to other plugins.
   * e.g the `expression_image` plugin should be marked as required for the `expression` plugin.
   */
  markAsRequiredFor(...pluginNames: PluginName[]): void;

  /**
   * Register an application as being owned by the current plugin.
   *
   * This is necessary because the applications are only registered on the client-side,
   * so we need all plugins to register their applications on the server-side too, and we
   * need that to compute the plugin dependency tree when loading an app.
   */
  registerApp(appId: string): void;
}
