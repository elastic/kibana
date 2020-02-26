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

import { defaults, isEqual, omit, map } from 'lodash';
import { FilterMeta, Filter } from '../../../../common';

export interface FilterCompareOptions {
  disabled?: boolean;
  negate?: boolean;
  state?: boolean;
}

/**
 * Include disabled, negate and store when comparing filters
 */
export const COMPARE_ALL_OPTIONS: FilterCompareOptions = {
  disabled: true,
  negate: true,
  state: true,
};

const mapFilter = (
  filter: Filter,
  comparators: FilterCompareOptions,
  excludedAttributes: string[]
) => {
  const cleaned: FilterMeta = omit(filter, excludedAttributes);

  if (comparators.negate) cleaned.negate = filter.meta && Boolean(filter.meta.negate);
  if (comparators.disabled) cleaned.disabled = filter.meta && Boolean(filter.meta.disabled);

  return cleaned;
};

const mapFilterArray = (
  filters: Filter[],
  comparators: FilterCompareOptions,
  excludedAttributes: string[]
) => {
  return map(filters, (filter: Filter) => mapFilter(filter, comparators, excludedAttributes));
};

/**
 * Compare two filters or filter arrays to see if they match.
 * For filter arrays, the assumption is they are sorted.
 *
 * @param {Filter | Filter[]} first The first filter or filter array to compare
 * @param {Filter | Filter[]} second The second filter or filter array to compare
 * @param {FilterCompareOptions} comparatorOptions Parameters to use for comparison
 *
 * @returns {bool} Filters are the same
 */
export const compareFilters = (
  first: Filter | Filter[],
  second: Filter | Filter[],
  comparatorOptions: FilterCompareOptions = {}
) => {
  let comparators: FilterCompareOptions = {};

  const excludedAttributes: string[] = ['$$hashKey', 'meta'];

  comparators = defaults(comparatorOptions || {}, {
    state: false,
    negate: false,
    disabled: false,
  });

  if (!comparators.state) excludedAttributes.push('$state');

  if (Array.isArray(first) && Array.isArray(second)) {
    return isEqual(
      mapFilterArray(first, comparators, excludedAttributes),
      mapFilterArray(second, comparators, excludedAttributes)
    );
  } else if (!Array.isArray(first) && !Array.isArray(second)) {
    return isEqual(
      mapFilter(first, comparators, excludedAttributes),
      mapFilter(second, comparators, excludedAttributes)
    );
  } else {
    return false;
  }
};
