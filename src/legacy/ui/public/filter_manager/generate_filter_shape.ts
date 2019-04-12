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

import { Filter } from 'plugins/embeddable_api/index';

export function generateFilters(input: {
  field: { name: string; scripted: boolean };
  value: string[];
  operation: string;
  index: string;
}): Filter[] {
  const { field, value, operation, index } = input;
  let values = value;
  values = Array.isArray(values) ? values : [values];
  const fieldName = _.isObject(field) ? field.name : field;
  const filters = _.flatten([]);
  const newFilters: Filter[] = [];

  const negate = operation === '-';

  // TODO: On array fields, negating does not negate the combination, rather all terms
  _.each(values, function(value) {
    let filter;
    switch (fieldName) {
      case '_exists_':
        filter = {
          meta: { negate, index },
          exists: {
            field: value,
          },
        };
        break;
      default:
        filter = { meta: { negate, index }, query: { match: {} } };
        filter.query.match[fieldName] = { query: value, type: 'phrase' };

        break;
    }

    newFilters.push(filter);
  });

  return newFilters;
}
