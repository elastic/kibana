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

import { SearchError } from './search_error';

export const noOpSearchStrategy = {
  id: 'noop',

  search: async () => {
    const searchError = new SearchError({
      status: '418', // "I'm a teapot" error
      title: 'No search strategy registered',
      message: `Couldn't find a search strategy for the search request`,
      path: '',
    });

    return {
      searching: Promise.reject(searchError),
      abort: () => {},
      failedSearchRequests: [],
    };
  },

  isViable: () => {
    return true;
  },
};
