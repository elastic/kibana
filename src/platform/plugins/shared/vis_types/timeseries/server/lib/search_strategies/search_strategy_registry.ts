/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { VisTypeTimeseriesRequest, VisTypeTimeseriesRequestHandlerContext } from '../../types';
import { AbstractSearchStrategy } from './strategies';
import type { FetchedIndexPattern } from '../../../common/types';

export class SearchStrategyRegistry {
  private strategies: AbstractSearchStrategy[] = [];

  public addStrategy(searchStrategy: AbstractSearchStrategy) {
    if (searchStrategy instanceof AbstractSearchStrategy) {
      this.strategies.unshift(searchStrategy);
    }
    return this.strategies;
  }

  async getViableStrategy(
    requestContext: VisTypeTimeseriesRequestHandlerContext,
    req: VisTypeTimeseriesRequest,
    fetchedIndexPattern: FetchedIndexPattern
  ) {
    for (const searchStrategy of this.strategies) {
      const { isViable, capabilities } = await searchStrategy.checkForViability(
        requestContext,
        req,
        fetchedIndexPattern
      );

      if (isViable) {
        return {
          searchStrategy,
          capabilities,
        };
      }
    }
  }
}
