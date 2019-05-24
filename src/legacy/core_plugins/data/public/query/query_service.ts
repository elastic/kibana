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

import { once } from 'lodash';
import {
  QueryBar,
  QueryBarInput,
  fromUser,
  toUser,
  getQueryLog,
  setupDirective as setupQueryBarDirective,
} from './query_bar';

/**
 * Query Service
 *
 * @internal
 */
export class QueryService {
  public setup() {
    return {
      loadLegacyDirectives: once(setupQueryBarDirective),
      helpers: {
        fromUser,
        toUser,
        getQueryLog,
      },
      ui: {
        QueryBar,
        QueryBarInput,
      },
    };
  }

  public stop() {
    // nothing to do here yet
  }
}

/** @public */
export type QuerySetup = ReturnType<QueryService['setup']>;

export { Query } from './query_bar';
