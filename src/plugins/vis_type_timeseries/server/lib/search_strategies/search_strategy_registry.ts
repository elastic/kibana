/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  extractIndexPatterns,
  convertIndexPatternObjectToStringRepresentation,
} from '../../../common/index_patterns_utils';
import { PanelSchema } from '../../../common/types';
import {
  VisTypeTimeseriesRequest,
  VisTypeTimeseriesRequestHandlerContext,
  VisTypeTimeseriesVisDataRequest,
} from '../../types';
import { AbstractSearchStrategy } from './strategies';
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
    indexPattern: string
  ) {
    for (const searchStrategy of this.strategies) {
      const { isViable, capabilities } = await searchStrategy.checkForViability(
        requestContext,
        req,
        indexPattern
      );

      if (isViable) {
        return {
          searchStrategy,
          capabilities,
        };
      }
    }
  }

  async getViableStrategyForPanel(
    requestContext: VisTypeTimeseriesRequestHandlerContext,
    req: VisTypeTimeseriesVisDataRequest,
    panel: PanelSchema
  ) {
    const indexPattern = extractIndexPatterns(panel, panel.default_index_pattern)
      .map(convertIndexPatternObjectToStringRepresentation)
      .join(',');

    return this.getViableStrategy(requestContext, req, indexPattern);
  }
}
