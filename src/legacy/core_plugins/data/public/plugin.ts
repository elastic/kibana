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

import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
} from '../../../../../src/core/public';

// Services
import { ExpressionsService, ExpressionsSetup } from './expressions';
import { FilterService, FilterSetup } from './filter';
import { IndexPatternsService, IndexPatternsSetup } from './index_patterns';
import { QueryService, QuerySetup } from './query';
import { SearchService, SearchSetup } from './search';

/** @public */
export interface DataPluginSetup {
  expressions: ExpressionsSetup;
  indexPatterns: IndexPatternsSetup;
  filter: FilterSetup;
  query: QuerySetup;
  search: SearchSetup;
}

export class DataPublicPlugin implements Plugin<DataPluginSetup, {}> {
  // Exposed services, sorted alphabetically
  private readonly expressions = new ExpressionsService();
  private readonly filter = new FilterService();
  private readonly indexPatterns = new IndexPatternsService();
  private readonly query = new QueryService();
  private readonly search = new SearchService();

  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, plugins: {}): DataPluginSetup {
    const indexPatternsSetup = this.indexPatterns.setup();

    return {
      expressions: this.expressions.setup(),
      indexPatterns: indexPatternsSetup,
      filter: this.filter.setup({ indexPatterns: indexPatternsSetup }),
      search: this.search.setup(),
      query: this.query.setup(),
    };
  }

  public start(core: CoreStart, plugins: {}) {
    return {};
  }

  public stop() {
    this.expressions.stop();
    this.indexPatterns.stop();
    this.filter.stop();
    this.search.stop();
    this.query.stop();
  }
}
