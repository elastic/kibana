/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export class PluginSystemOverrides {
  private static allPluginsEnabled: true | undefined = undefined;

  public static setAllPluginsEnabled(): void {
    PluginSystemOverrides.allPluginsEnabled = true;
  }
  public static getEnableAllPlugins(): true | undefined {
    return PluginSystemOverrides.allPluginsEnabled;
  }
}
