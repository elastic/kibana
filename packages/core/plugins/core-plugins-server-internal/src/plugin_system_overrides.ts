/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export class PluginSystemOverrides {
  /**
   * Setting this value to "true" will enable ALL plugins regardless of their
   * default config or Kibana config settings.
   */
  private static allPluginsEnabled: undefined | true = undefined;

  /**
   * Enable all plugins.
   *
   * @note must called be early: pre-preboot to have desired effect.
   */
  public static setAllPluginsEnabled(): void {
    PluginSystemOverrides.allPluginsEnabled = true;
  }
  /**
   * Only an explicit "true" value should indicate all plugins are enabled
   */
  public static getEnableAllPlugins(): undefined | true {
    return PluginSystemOverrides.allPluginsEnabled;
  }
}
