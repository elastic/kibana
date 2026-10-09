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
import { isSearchConfig, isSortingConfig } from '../types';
import { DEFAULT_INITIAL_SORT, DEFAULT_SORT_FIELDS, getSortFieldDirections } from '../sorting';
import { encodeQueryValue } from './encode_query_value';
import type { SortField } from '../sorting';
import type { ParsedQuery, UrlStateSlices } from './types';

/**
 * The state of a sort configuration.
 *
 * @property field - The field to sort by.
 * @property direction - The direction to sort in.
 */
export interface SortState {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * The sort directions offered for each sortable field, keyed by field.
 */
export type SortDirectionsByField = ReadonlyMap<string, ReadonlySet<SortState['direction']>>;

/**
 * The configuration for a sorting URL.
 *
 * @property initialSort - The initial sort state.
 * @property sortDirectionsByField - The directions offered for each sortable field.
 */
export interface SortingUrlConfig {
  initialSort: SortState;
  sortDirectionsByField: SortDirectionsByField;
}

/**
 * The separator for sort configuration keys.
 */
const SORT_CONFIG_KEY_SEPARATOR = '\u001f';

/**
 * Builds the `field:direction` key that identifies an offered sort option.
 * Matches the `sort` URL param format.
 */
const getSortOptionKey = ({ field, direction }: SortState): string => `${field}:${direction}`;

const toFieldSortOptions = (fields: SortField[]): SortState[] =>
  fields.flatMap((sortField) =>
    getSortFieldDirections(sortField).map((direction) => ({ field: sortField.field, direction }))
  );

/**
 * Gets the `(field, direction)` pairs the sort dropdown offers for a sorting configuration.
 *
 * @param sorting - The sorting configuration.
 * @returns The offered sort options.
 */
const getSortingOptions = (sorting: ContentListFeatures['sorting']): SortState[] => {
  if (sorting === false) {
    return [];
  }
  if (isSortingConfig(sorting)) {
    if (sorting.fields) {
      return toFieldSortOptions(sorting.fields);
    }
    if (sorting.options) {
      return sorting.options.map(({ field, direction }) => ({ field, direction }));
    }
  }
  return toFieldSortOptions(DEFAULT_SORT_FIELDS);
};

/**
 * Gets the initial sort from the sorting configuration.
 *
 * @param sorting - The sorting configuration.
 * @returns The initial sort.
 */
const getInitialSort = (sorting: ContentListFeatures['sorting']): SortState => {
  if (isSortingConfig(sorting) && sorting.initialSort) {
    return sorting.initialSort;
  }
  return DEFAULT_INITIAL_SORT;
};

/**
 * Gets the sorting configuration key from the sorting configuration.
 *
 * @param sorting - The sorting configuration.
 * @returns The sorting configuration key.
 */
export const getSortingConfigKey = (sorting: ContentListFeatures['sorting']): string => {
  const initialSort = getInitialSort(sorting);
  const options = [...new Set(getSortingOptions(sorting).map(getSortOptionKey))].sort();
  return [initialSort.field, initialSort.direction, ...options].join(SORT_CONFIG_KEY_SEPARATOR);
};

/**
 * Gets the sorting URL configuration from the sorting configuration key.
 *
 * @param key - The sorting configuration key.
 * @returns The sorting URL configuration.
 */
export const getSortingUrlConfigFromKey = (key: string): SortingUrlConfig => {
  const [
    field = DEFAULT_INITIAL_SORT.field,
    direction = DEFAULT_INITIAL_SORT.direction,
    ...options
  ] = key.split(SORT_CONFIG_KEY_SEPARATOR);
  const validDirection = direction === 'desc' ? 'desc' : 'asc';
  const sortDirectionsByField = new Map<string, Set<SortState['direction']>>();
  for (const option of options) {
    const separatorIndex = option.lastIndexOf(':');
    const optionField = option.slice(0, separatorIndex);
    const optionDirection = option.slice(separatorIndex + 1);
    if (optionDirection === 'asc' || optionDirection === 'desc') {
      const directions =
        sortDirectionsByField.get(optionField) ?? new Set<SortState['direction']>();
      sortDirectionsByField.set(optionField, directions.add(optionDirection));
    }
  }
  return { initialSort: { field, direction: validDirection }, sortDirectionsByField };
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
    return { sort: getSortOptionKey(sort) };
  },
  decode: (params: ParsedQuery): SortState | undefined => {
    if (typeof params.sort !== 'string') {
      return undefined;
    }
    const [field, direction, extra] = params.sort.split(':');
    if (extra !== undefined || !field || (direction !== 'asc' && direction !== 'desc')) {
      onUnknownValue?.(params.sort);
      return undefined;
    }
    if (!sortDirectionsByField.get(field)?.has(direction)) {
      onUnknownValue?.(params.sort);
      return undefined;
    }
    return { field, direction };
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
