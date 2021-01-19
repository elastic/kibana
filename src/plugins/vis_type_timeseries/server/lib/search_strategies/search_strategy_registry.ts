/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
