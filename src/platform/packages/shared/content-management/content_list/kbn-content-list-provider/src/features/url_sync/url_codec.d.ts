/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContentListFeatures } from '../types';
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
 * The configuration for a sorting URL.
 *
 * @property initialSort - The initial sort state.
 * @property validSortFields - The valid sort fields.
 */
export interface SortingUrlConfig {
  initialSort: SortState;
  validSortFields: ReadonlySet<string>;
}
/**
 * Gets the sorting configuration key from the sorting configuration.
 *
 * @param sorting - The sorting configuration.
 * @returns The sorting configuration key.
 */
export declare const getSortingConfigKey: (sorting: ContentListFeatures['sorting']) => string;
/**
 * Gets the sorting URL configuration from the sorting configuration key.
 *
 * @param key - The sorting configuration key.
 * @returns The sorting URL configuration.
 */
export declare const getSortingUrlConfigFromKey: (key: string) => SortingUrlConfig;
/**
 * Gets the initial query text from the search configuration.
 *
 * @param search - The search configuration.
 * @returns The initial query text.
 */
export declare const getInitialQueryText: (search: ContentListFeatures['search']) => string;
/**
 * The codec for query text.
 *
 * @property key - The key for the query text.
 * @property encode - Encodes the query text.
 * @property decode - Decodes the query text.
 */
export declare const queryTextCodec: {
  key: string;
  encode: (queryText: string) => Partial<ParsedQuery>;
  decode: (params: ParsedQuery) => string | undefined;
};
/**
 * The codec for sort.
 *
 * @property key - The key for the sort.
 * @property encode - Encodes the sort.
 * @property decode - Decodes the sort.
 */
export declare const sortCodec: (
  validSortFields: ReadonlySet<string>,
  initialSort: SortState,
  onUnknownField?: (field: string) => void
) => {
  key: string;
  encode: (sort: SortState | undefined) => Partial<ParsedQuery>;
  decode: (params: ParsedQuery) => SortState | undefined;
};
/**
 * Parses the search string into a {@link ParsedQuery} object.
 *
 * @param search - The search string.
 * @returns The parsed query.
 */
export declare const parseSearch: (search: string) => ParsedQuery;
/**
 * Stringifies the search parameters into a URL search string. Uses an
 * RFC 3986–friendly encoder (see {@link encodeQueryValue}) so unrelated
 * params we pass through verbatim (e.g. Rison-encoded `_g` / `_a`) keep
 * their readable form after a URL rewrite.
 *
 * @param params - The search parameters.
 * @returns The URL search string.
 */
export declare const stringifySearch: (params: ParsedQuery) => string;
/**
 * Encodes the URL state into a {@link Partial<ParsedQuery>} object.
 *
 * @param state - The URL state.
 * @param initialSort - The initial sort.
 * @returns The encoded URL state.
 */
export declare const encodeUrlState: (
  state: UrlStateSlices,
  initialSort: SortState
) => Partial<ParsedQuery>;
/**
 * Decodes the new shape of the URL state.
 *
 * @param search - The search string.
 * @param validSortFields - The valid sort fields.
 * @param initialSort - The initial sort.
 * @param onUnknownField - A callback to call when an unknown field is encountered.
 * @returns The decoded URL state.
 */
export declare const decodeNewShape: (
  search: string,
  validSortFields: ReadonlySet<string>,
  initialSort: SortState,
  onUnknownField?: (field: string) => void
) => UrlStateSlices;
/**
 * Checks if the URL parameters have the new shape.
 *
 * @param params - The URL parameters.
 * @returns `true` if the URL parameters have the new shape, `false` otherwise.
 */
export declare const hasNewShapeParams: (params: ParsedQuery) => boolean;
/**
 * Merges the updates into the current search and stringifies the result.
 *
 * @param currentSearch - The current search.
 * @param updates - The updates.
 * @param consumed - The consumed keys.
 * @returns The merged and stringified search.
 */
export declare const mergeAndStringify: (
  currentSearch: string,
  updates: Partial<ParsedQuery>,
  consumed?: ReadonlyArray<string>
) => string;
