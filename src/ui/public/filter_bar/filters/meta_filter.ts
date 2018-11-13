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

import { Filter } from 'ui/filter_bar/filters/index';

export type MetaFilter = Filter & {
  disabled: boolean;
  negate: boolean;
  pinned: boolean;
  index?: string;
  toElasticsearchQuery: () => void;
};

interface CreateMetaFilterOptions {
  disabled?: boolean;
  negate?: boolean;
  pinned?: boolean;
  index?: string;
}

export function createMetaFilter(
  filter: Filter,
  { disabled = false, negate = false, pinned = false, index }: CreateMetaFilterOptions = {}
): MetaFilter {
  const metaFilter = Object.create(filter);
  metaFilter.disabled = disabled;
  metaFilter.negate = negate;
  metaFilter.pinned = pinned;
  metaFilter.index = index;
  metaFilter.toElasticsearchQuery = function() {
    return this;
    // TODO implement me
    // if negate === true then wrap filter in a `not` filter
    // call underlying filter's toElasticsearchQuery
    // e.g. Object.getPrototypeOf(this).toElasticsearchQuery();
  };
  return metaFilter;
}

export function toggleNegation(filter: MetaFilter) {
  const meta = {
    ...filter,
    negate: !filter.negate,
  };
  return createMetaFilter(Object.getPrototypeOf(filter), meta);
}

export function togglePinned(filter: MetaFilter) {
  const meta = {
    ...filter,
    pinned: !filter.pinned,
  };
  return createMetaFilter(Object.getPrototypeOf(filter), meta);
}

export function toggleDisabled(filter: MetaFilter) {
  const meta = {
    ...filter,
    disabled: !filter.disabled,
  };
  return createMetaFilter(Object.getPrototypeOf(filter), meta);
}
