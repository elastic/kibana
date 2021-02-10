/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DeprecationInfo, DeprecationContext } from './types';

export class Deprecations {
  private readonly deprecations: { [key: string]: DeprecationContext } = {};

  public registerDeprecations = (deprecation: DeprecationContext) => {
    if (this.deprecations[deprecation.pluginId]) {
      throw new Error(`Plugin "${deprecation.pluginId}" is duplicated.`);
    }

    this.deprecations[deprecation.pluginId] = deprecation;
  };

  public getDeprecationInfoByPluginId = (pluginId: string) => {
    return this.deprecations[pluginId];
  };

  public getDeprecationInfo = () => {
    return this.deprecations;
  };
}
