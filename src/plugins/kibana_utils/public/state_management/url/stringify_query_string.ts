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
import { transform } from 'lodash';
import { stringify } from 'query-string';
import { encodeQueryComponent } from '../../url';

// encodeUriQuery implements the less-aggressive encoding done naturally by
// the browser. We use it to generate the same urls the browser would
export const stringifyQueryString = (query: Record<string, any>) => {
  const encodedQuery = transform(query, (result, value, key) => {
    if (key && value) {
      result[key] = encodeQueryComponent(value, true);
    }
  });

  return stringify(encodedQuery, {
    strict: false,
    encode: false,
    sort: false,
  });
};
