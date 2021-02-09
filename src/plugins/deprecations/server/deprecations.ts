/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

interface DeprecationInfo {
  message: string;
  documentationUrl: string;
  level: 'critical' | 'warning';
  correctiveAction?: () => void;
}

interface PluginDeprecation {
  pluginId: string;
  getDeprecations: () => Promise<DeprecationInfo>;
}

export class Deprecations {
  private readonly deprecations: { [key: string]: PluginDeprecation } = {};

  public registerDeprecations = (deprecation: PluginDeprecation) => {
    if (this.deprecations[deprecation.pluginId]) {
      throw new Error(`Plugin "${deprecation.pluginId}" is duplicated.`);
    }

    this.deprecations[deprecation.pluginId] = deprecation;
  };

  public getDeprecationsByPluginId = (pluginId: string) => {
    return this.deprecations[pluginId];
  };

  public getDeprecations = () => {
    return this.deprecations;
  };
}
