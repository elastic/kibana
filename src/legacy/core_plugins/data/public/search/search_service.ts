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

import { CoreSetup, CoreStart } from '../../../../../core/public';
import { IndexPattern } from '../../../../../plugins/data/public';

export interface SearchSetup {
  aggs: AggsSetup;
}

export interface SearchStart {
  aggs: AggsStart;
}

/**
 * The contract provided here is a new platform shim for ui/agg_types.
 *
 * Once it has been refactored to work with new platform services,
 * it will move into the existing search service in src/plugins/data/public/search
 */
export class SearchService {
  public setup(core: CoreSetup): SearchSetup {
    return {};
  }

  public start(core: CoreStart): SearchStart {
    return {};
  }

  public stop() {}
}
