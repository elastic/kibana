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
import { getInterpreter } from 'plugins/interpreter/interpreter';
// @ts-ignore
import { renderersRegistry } from 'plugins/interpreter/registries';
import { ExpressionExecutorService } from './expression_executor';

import { SearchBarService } from './search_bar';
import { QueryBarService } from './query_bar';
import { IndexPatternsService, IndexPatternsSetup } from './index_patterns';

class DataPlugin {
  private readonly indexPatterns: IndexPatternsService;
  private readonly searchBar: SearchBarService;
  private readonly queryBar: QueryBarService;
  private readonly expressionExecutor: ExpressionExecutorService;

  constructor() {
    this.indexPatterns = new IndexPatternsService();
    this.queryBar = new QueryBarService();
    this.searchBar = new SearchBarService();
    this.expressionExecutor = new ExpressionExecutorService();
  }

  public setup() {
    return {
      indexPatterns: this.indexPatterns.setup(),
      search: this.searchBar.setup(),
      query: this.queryBar.setup(),
      expressionExecutor: this.expressionExecutor.setup(null, {
        interpreter: {
          getInterpreter,
          renderersRegistry,
        },
      }),
    };
  }

  public stop() {
    this.indexPatterns.stop();
    this.searchBar.stop();
    this.queryBar.stop();
    this.expressionExecutor.stop();
  }
}

/**
 * We export data here so that users importing from 'plugins/data'
 * will automatically receive the response value of the `setup` contract, mimicking
 * the data that will eventually be injected by the new platform.
 */
export const data = new DataPlugin().setup();

/** @public */
export interface DataSetup {
  indexPatterns: IndexPatternsSetup;
}

export { ExpressionExecutorSetup } from './expression_executor';

/** @public types */
export { IndexPattern, StaticIndexPattern, StaticIndexPatternField, Field } from './index_patterns';
