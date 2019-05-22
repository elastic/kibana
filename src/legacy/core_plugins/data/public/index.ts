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

import { SearchService } from './search';
import { QueryService } from './query';
import { IndexPatternsService, IndexPatternsSetup } from './index_patterns';

class DataPlugin {
  private readonly indexPatterns: IndexPatternsService;
  private readonly search: SearchService;
  private readonly query: QueryService;

  constructor() {
    this.indexPatterns = new IndexPatternsService();
    this.query = new QueryService();
    this.search = new SearchService();
  }

  public setup() {
    return {
      indexPatterns: this.indexPatterns.setup(),
      search: this.search.setup(),
      query: this.query.setup(),
    };
  }

  public stop() {
    this.indexPatterns.stop();
    this.search.stop();
    this.query.stop();
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

/** @public types */
export { IndexPattern, StaticIndexPattern, StaticIndexPatternField, Field } from './index_patterns';
