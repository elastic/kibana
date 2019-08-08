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

import { CoreSetup, CoreStart, Plugin } from '../../../../core/public';
import { ExpressionsService, ExpressionsSetup } from './expressions';
import { SearchService, SearchSetup } from './search';
import { QueryService, QuerySetup } from './query';
import { FilterService, FilterSetup } from './filter';
import { IndexPatternsService, IndexPatternsSetup } from './index_patterns';
import { LegacyDependenciesPluginSetup } from './shim/legacy_dependencies_plugin';

/**
 * Interface for any dependencies on other plugins' `setup` contracts.
 *
 * @internal
 */
export interface DataPluginSetupDependencies {
  __LEGACY: LegacyDependenciesPluginSetup;
  interpreter: any;
}

/**
 * Interface for this plugin's returned `setup` contract.
 *
 * @public
 */
export interface DataSetup {
  expressions: ExpressionsSetup;
  indexPatterns: IndexPatternsSetup;
  filter: FilterSetup;
  query: QuerySetup;
  search: SearchSetup;
}

/**
 * Data Plugin - public
 *
 * This is the entry point for the entire client-side public contract of the plugin.
 * If something is not explicitly exported here, you can safely assume it is private
 * to the plugin and not considered stable.
 *
 * All stateful contracts will be injected by the platform at runtime, and are defined
 * in the setup/start interfaces. The remaining items exported here are either types,
 * or static code.
 */
export class DataPlugin implements Plugin<DataSetup, void, DataPluginSetupDependencies> {
  // Exposed services, sorted alphabetically
  private readonly expressions: ExpressionsService = new ExpressionsService();
  private readonly filter: FilterService = new FilterService();
  private readonly indexPatterns: IndexPatternsService = new IndexPatternsService();
  private readonly query: QueryService = new QueryService();
  private readonly search: SearchService = new SearchService();

  public setup(core: CoreSetup, { __LEGACY, interpreter }: DataPluginSetupDependencies): DataSetup {
    const indexPatternsService = this.indexPatterns.setup();
    return {
      expressions: this.expressions.setup({
        interpreter,
      }),
      indexPatterns: indexPatternsService,
      filter: this.filter.setup({
        indexPatterns: indexPatternsService.indexPatterns,
      }),
      query: this.query.setup(),
      search: this.search.setup(),
    };
  }

  public start(core: CoreStart) {}

  public stop() {
    this.expressions.stop();
    this.indexPatterns.stop();
    this.filter.stop();
    this.query.stop();
    this.search.stop();
  }
}
