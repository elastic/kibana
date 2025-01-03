/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { defaults, isEqual, omit, map } from 'lodash';
import type { FilterMeta, Filter } from '../build_filters';
import { isCombinedFilter } from '../build_filters';

/** @public */
export interface FilterCompareOptions {
  index?: boolean;
  disabled?: boolean;
  negate?: boolean;
  state?: boolean;
  alias?: boolean;
}

/**
 * Include disabled, negate and store when comparing filters
 * @public
 */
export const COMPARE_ALL_OPTIONS: FilterCompareOptions = {
  index: true,
  disabled: true,
  negate: true,
  state: true,
  alias: true,
};

// Combined filters include sub-filters in the `meta` property and the relation type in the `relation` property, so
// they should never be excluded in the comparison
const removeRequiredAttributes = (excludedAttributes: string[]) =>
  excludedAttributes.filter((attribute) => !['meta', 'relation'].includes(attribute));

const mapFilter = (
  filter: Filter,
  comparators: FilterCompareOptions,
  excludedAttributes: string[]
) => {
  const attrsToExclude = isCombinedFilter(filter)
    ? removeRequiredAttributes(excludedAttributes)
    : excludedAttributes;

  const cleaned: FilterMeta = omit(filter, attrsToExclude) as FilterMeta;
  if (comparators.index) cleaned.index = filter.meta?.index;
  if (comparators.negate) cleaned.negate = filter.meta && Boolean(filter.meta.negate);
  if (comparators.disabled) cleaned.disabled = filter.meta && Boolean(filter.meta.disabled);
  if (comparators.alias) cleaned.alias = filter.meta?.alias;

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
 *
 * @public
 */
export const compareFilters = (
  first: Filter | Filter[],
  second: Filter | Filter[],
  comparatorOptions: FilterCompareOptions = {}
) => {
  if (!first || !second) return false;

  let comparators: FilterCompareOptions = {};

  const excludedAttributes: string[] = ['$$hashKey', 'meta'];

  comparators = defaults(comparatorOptions || {}, {
    index: false,
    state: false,
    negate: false,
    disabled: false,
    alias: false,
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
