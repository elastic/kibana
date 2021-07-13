/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  DeprecationsDetails,
  RegisterDeprecationsConfig,
  GetDeprecationsContext,
} from './types';

export class DeprecationsRegistry {
  private readonly deprecationContexts: RegisterDeprecationsConfig[] = [];

  public registerDeprecations = (deprecationContext: RegisterDeprecationsConfig) => {
    if (typeof deprecationContext.getDeprecations !== 'function') {
      throw new Error(`getDeprecations must be a function in registerDeprecations(context)`);
    }

    this.deprecationContexts.push(deprecationContext);
  };

  public getDeprecations = async (
    dependencies: GetDeprecationsContext
  ): Promise<Array<PromiseSettledResult<DeprecationsDetails[]>>> => {
    return await Promise.allSettled(
      this.deprecationContexts.map(
        async (deprecationContext) => await deprecationContext.getDeprecations(dependencies)
      )
    );
  };
}
