/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { extractIndexPatterns } from '../../../common/extract_index_patterns';
import { PanelSchema } from '../../../common/types';
import { AbstractSearchStrategy, ReqFacade } from './strategies';

export type RequestFacade = ReqFacade<any>;

export class SearchStrategyRegistry {
  private strategies: AbstractSearchStrategy[] = [];

  public addStrategy(searchStrategy: AbstractSearchStrategy) {
    if (searchStrategy instanceof AbstractSearchStrategy) {
      this.strategies.unshift(searchStrategy);
    }
    return this.strategies;
  }

  async getViableStrategy(req: RequestFacade, indexPattern: string) {
    for (const searchStrategy of this.strategies) {
      const { isViable, capabilities } = await searchStrategy.checkForViability(req, indexPattern);

      if (isViable) {
        return {
          searchStrategy,
          capabilities,
        };
      }
    }
  }

  async getViableStrategyForPanel(req: RequestFacade, panel: PanelSchema) {
    const indexPattern = extractIndexPatterns(panel, panel.default_index_pattern).join(',');

    return this.getViableStrategy(req, indexPattern);
  }
}
