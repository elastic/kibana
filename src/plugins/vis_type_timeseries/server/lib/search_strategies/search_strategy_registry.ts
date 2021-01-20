/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { AbstractSearchStrategy } from './strategies/abstract_search_strategy';
// @ts-ignore
import { DefaultSearchStrategy } from './strategies/default_search_strategy';
// @ts-ignore
import { extractIndexPatterns } from '../../../common/extract_index_patterns';

export type RequestFacade = any;

import { PanelSchema } from '../../../common/types';

export class SearchStrategyRegistry {
  private strategies: AbstractSearchStrategy[] = [];

  constructor() {
    this.addStrategy(new DefaultSearchStrategy());
  }

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
