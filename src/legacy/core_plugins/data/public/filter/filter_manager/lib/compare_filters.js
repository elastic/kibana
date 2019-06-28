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

import _ from 'lodash';
let excludedAttributes;
let comparators;

/**
 * Compare two filters to see if they match
 * @param {object} first The first filter to compare
 * @param {object} second The second filter to compare
 * @param {object} comparatorOptions Parameters to use for comparison
 * @returns {bool} Filters are the same
 */
export function compareFilters(first, second, comparatorOptions) {
  excludedAttributes = ['$$hashKey', 'meta'];
  comparators = _.defaults(comparatorOptions || {}, {
    state: false,
    negate: false,
    disabled: false,
  });

  if (!comparators.state) excludedAttributes.push('$state');

  return _.isEqual(mapFilter(first), mapFilter(second));
}

function mapFilter(filter) {
  const cleaned = _.omit(filter, excludedAttributes);
  if (comparators.negate) cleaned.negate = filter.meta && !!filter.meta.negate;
  if (comparators.disabled) cleaned.disabled = filter.meta && !!filter.meta.disabled;
  return cleaned;
}
