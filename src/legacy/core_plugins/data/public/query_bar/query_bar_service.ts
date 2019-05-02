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
import { QueryBar } from './components/query_bar';
import { fromUser } from './lib/from_user';
import { toUser } from './lib/to_user';

// @ts-ignore
import { setupDirective } from './directive';

/**
 * Query Bar Service
 *
 * @internal
 */
export class QueryBarService {
  public setup() {
    return {
      loadLegacyDirectives: once(setupDirective),
      helpers: {
        fromUser,
        toUser,
      },
      ui: {
        QueryBar,
      },
    };
  }

  public stop() {
    // nothing to do here yet
  }
}

/** @public */
export type QueryBarSetup = ReturnType<QueryBarService['setup']>;
