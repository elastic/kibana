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

// TODO these are imports from the old plugin world.
// Once the new platform is ready, they can get removed
// and handled by the platform itself in the setup method
// of the ExpressionExectorService
// @ts-ignore
import { renderersRegistry } from 'plugins/interpreter/registries';
import { ExpressionsService, ExpressionsSetup } from './expressions';
import { SearchService, SearchSetup } from './search';
import { QueryService, QuerySetup } from './query';
import { FilterService, FilterSetup } from './filter';
import { IndexPatternsService, IndexPatternsSetup } from './index_patterns';

export class DataPlugin {
  // Exposed services, sorted alphabetically
  private readonly expressions: ExpressionsService;
  private readonly filter: FilterService;
  private readonly indexPatterns: IndexPatternsService;
  private readonly search: SearchService;
  private readonly query: QueryService;

  constructor() {
    this.indexPatterns = new IndexPatternsService();
    this.filter = new FilterService();
    this.query = new QueryService();
    this.search = new SearchService();
    this.expressions = new ExpressionsService();
  }

  public setup(): DataSetup {
    // TODO: this is imported here to avoid circular imports.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getInterpreter } = require('plugins/interpreter/interpreter');
    return {
      expressions: this.expressions.setup({
        interpreter: {
          getInterpreter,
          renderersRegistry,
        },
      }),
      indexPatterns: this.indexPatterns.setup(),
      filter: this.filter.setup(),
      search: this.search.setup(),
      query: this.query.setup(),
    };
  }

  public stop() {
    this.expressions.stop();
    this.indexPatterns.stop();
    this.filter.stop();
    this.search.stop();
    this.query.stop();
  }
}

/** @public */
export interface DataSetup {
  expressions: ExpressionsSetup;
  indexPatterns: IndexPatternsSetup;
  filter: FilterSetup;
  search: SearchSetup;
  query: QuerySetup;
}

/** @public types */
export { ExpressionRenderer, ExpressionRendererProps, ExpressionRunner } from './expressions';

/** @public types */
export { IndexPattern, StaticIndexPattern, StaticIndexPatternField, Field } from './index_patterns';
export { Query } from './query';
