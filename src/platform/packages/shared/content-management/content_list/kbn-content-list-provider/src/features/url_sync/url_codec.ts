/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import queryString from 'query-string';
import type { ContentListFeatures } from '../types';
import { isSearchConfig } from '../types';
import type { SortDirectionsByField, SortState } from '../sorting';
import {
  getAllowedSorts,
  getSortKey,
  isAllowedSort,
  isSortDirection,
  parseSortKey,
  toSortDirectionsByField,
} from '../sorting';
import { encodeQueryValue } from './encode_query_value';
import type { ParsedQuery, UrlStateSlices } from './types';

/**
 * The configuration for a sorting URL.
 *
 * @property sortDirectionsByField - The directions offered for each sortable field.
 */
export interface SortingUrlConfig {
  sortDirectionsByField: SortDirectionsByField;
}

/**
 * The separator for sort configuration keys.
 */
const SORT_CONFIG_KEY_SEPARATOR = '\u001f';

/**
 * Gets the sorting configuration key from the sorting configuration.
 *
 * @param sorting - The sorting configuration.
 * @returns The sorting configuration key.
 */
export const getSortingConfigKey = (sorting: ContentListFeatures['sorting']): string =>
  [...new Set(getAllowedSorts(sorting).map(getSortKey))].sort().join(SORT_CONFIG_KEY_SEPARATOR);

/**
 * Gets the sorting URL configuration from the sorting configuration key.
 *
 * @param key - The sorting configuration key.
 * @returns The sorting URL configuration.
 */
export const getSortingUrlConfigFromKey = (key: string): SortingUrlConfig => {
  const options = key.split(SORT_CONFIG_KEY_SEPARATOR);
  const parsedSorts = options.flatMap((option): SortState[] => {
    const separatorIndex = option.lastIndexOf(':');
    const optionDirection = option.slice(separatorIndex + 1);
    return isSortDirection(optionDirection)
      ? [{ field: option.slice(0, separatorIndex), direction: optionDirection }]
      : [];
  });
  return { sortDirectionsByField: toSortDirectionsByField(parsedSorts) };
};

/**
 * Gets the initial query text from the search configuration.
 *
 * @param search - The search configuration.
 * @returns The initial query text.
 */
export const getInitialQueryText = (search: ContentListFeatures['search']): string => {
  if (isSearchConfig(search) && search.initialSearch) {
    return search.initialSearch;
  }
  return '';
};

/**
 * The codec for query text.
 *
 * @property key - The key for the query text.
 * @property encode - Encodes the query text.
 * @property decode - Decodes the query text.
 */
export const queryTextCodec = {
  key: 'q',
  encode: (queryText: string): Partial<ParsedQuery> => ({
    q: queryText ? queryText : undefined,
  }),
  decode: (params: ParsedQuery): string | undefined =>
    typeof params.q === 'string' ? params.q : undefined,
};

/**
 * The codec for sort.
 *
 * @param sortDirectionsByField - The directions offered for each sortable field.
 * @param initialSort - The initial sort, omitted from the URL when active.
 * @param onUnknownValue - Called with the raw `sort` value when it is malformed or not offered.
 */
export const sortCodec = (
  sortDirectionsByField: SortDirectionsByField,
  initialSort: SortState,
  onUnknownValue?: (value: string) => void
) => ({
  key: 'sort',
  encode: (sort: SortState | undefined): Partial<ParsedQuery> => {
    if (!sort || (sort.field === initialSort.field && sort.direction === initialSort.direction)) {
      return { sort: undefined };
    }
    return { sort: getSortKey(sort) };
  },
  decode: (params: ParsedQuery): SortState | undefined => {
    if (typeof params.sort !== 'string') {
      return undefined;
    }
    const sort = parseSortKey(params.sort);
    if (!sort || !isAllowedSort(sortDirectionsByField, sort)) {
      onUnknownValue?.(params.sort);
      return undefined;
    }
    return sort;
  },
});

/**
 * Parses the search string into a {@link ParsedQuery} object.
 *
 * @param search - The search string.
 * @returns The parsed query.
 */
export const parseSearch = (search: string): ParsedQuery =>
  queryString.parse(search) as ParsedQuery;

/**
 * Stringifies the search parameters into a URL search string. Uses an
 * RFC 3986–friendly encoder (see {@link encodeQueryValue}) so unrelated
 * params we pass through verbatim (e.g. Rison-encoded `_g` / `_a`) keep
 * their readable form after a URL rewrite.
 *
 * @param params - The search parameters.
 * @returns The URL search string.
 */
export const stringifySearch = (params: ParsedQuery): string => {
  const encoded: Record<string, string | string[] | null> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      continue;
    }
    if (value === null) {
      encoded[key] = null;
      continue;
    }
    encoded[key] = Array.isArray(value)
      ? value.map((entry) => (entry === null ? '' : encodeQueryValue(entry)))
      : encodeQueryValue(value);
  }

  const search = queryString.stringify(encoded, {
    sort: (left, right) => left.localeCompare(right),
    encode: false,
  });
  return search ? `?${search}` : '';
};

/**
 * Encodes the URL state into a {@link Partial<ParsedQuery>} object.
 *
 * @param state - The URL state.
 * @param initialSort - The initial sort.
 * @returns The encoded URL state.
 */
export const encodeUrlState = (
  state: UrlStateSlices,
  initialSort: SortState
): Partial<ParsedQuery> => ({
  ...queryTextCodec.encode(state.queryText ?? ''),
  ...sortCodec(new Map(), initialSort).encode(state.sort),
});

/**
 * Decodes the new shape of the URL state.
 *
 * @param search - The search string.
 * @param sortDirectionsByField - The directions offered for each sortable field.
 * @param initialSort - The initial sort.
 * @param onUnknownValue - A callback to call when a sort value is malformed or not offered.
 * @returns The decoded URL state.
 */
export const decodeNewShape = (
  search: string,
  sortDirectionsByField: SortDirectionsByField,
  initialSort: SortState,
  onUnknownValue?: (value: string) => void
): UrlStateSlices => {
  const params = parseSearch(search);
  const state: UrlStateSlices = {};
  const queryText = queryTextCodec.decode(params);
  const sort = sortCodec(sortDirectionsByField, initialSort, onUnknownValue).decode(params);

  if (queryText !== undefined) {
    state.queryText = queryText;
  }
  if (sort !== undefined) {
    state.sort = sort;
  }

  return state;
};

/**
 * Checks if the URL parameters have the new shape.
 *
 * @param params - The URL parameters.
 * @returns `true` if the URL parameters have the new shape, `false` otherwise.
 */
export const hasNewShapeParams = (params: ParsedQuery): boolean =>
  typeof params.q === 'string' || (typeof params.sort === 'string' && params.sort.includes(':'));

/**
 * Merges the updates into the current search and stringifies the result.
 *
 * @param currentSearch - The current search.
 * @param updates - The updates.
 * @param consumed - The consumed keys.
 * @returns The merged and stringified search.
 */
export const mergeAndStringify = (
  currentSearch: string,
  updates: Partial<ParsedQuery>,
  consumed: ReadonlyArray<string> = []
): string => {
  const params: ParsedQuery = { ...parseSearch(currentSearch) };

  for (const key of consumed) {
    delete params[key];
  }

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) {
      delete params[key];
    } else {
      params[key] = value;
    }
  }

  return stringifySearch(params);
};
