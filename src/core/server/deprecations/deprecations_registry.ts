/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { withTimeout, isPromise } from '@kbn/std';
import type {
  DeprecationsDetails,
  RegisterDeprecationsConfig,
  GetDeprecationsContext,
} from './types';

const MsInSec = 1000;

export class DeprecationsRegistry {
  private readonly timeout: number;
  private readonly deprecationContexts: RegisterDeprecationsConfig[] = [];

  constructor({ timeout = 10 * MsInSec }: { timeout?: number } = {}) {
    this.timeout = timeout;
  }

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
      this.deprecationContexts.map(async (deprecationContext) => {
        const maybePromise = deprecationContext.getDeprecations(dependencies);
        if (isPromise(maybePromise)) {
          const resultOrTimeout = await withTimeout({
            promise: maybePromise,
            timeoutMs: this.timeout,
          });
          if (resultOrTimeout.timedout) {
            throw new Error('Deprecations did not resolve in 10sec.');
          }
          return resultOrTimeout.value;
        } else {
          return maybePromise;
        }
      })
    );
  };
}
