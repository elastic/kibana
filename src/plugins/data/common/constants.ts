/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const DEFAULT_QUERY_LANGUAGE = 'kuery';
export const KIBANA_USER_QUERY_LANGUAGE_KEY = 'kibana.userQueryLanguage';

/** @public **/
export const INDEX_PATTERN_SAVED_OBJECT_TYPE = 'index-pattern';

export type ValueSuggestionsMethod = 'terms_enum' | 'terms_agg';

export const UI_SETTINGS = {
  META_FIELDS: 'metaFields',
  DOC_HIGHLIGHT: 'doc_table:highlight',
  QUERY_STRING_OPTIONS: 'query:queryString:options',
  QUERY_ALLOW_LEADING_WILDCARDS: 'query:allowLeadingWildcards',
  SEARCH_QUERY_LANGUAGE: 'search:queryLanguage',
  SORT_OPTIONS: 'sort:options',
  COURIER_IGNORE_FILTER_IF_FIELD_NOT_IN_INDEX: 'courier:ignoreFilterIfFieldNotInIndex',
  COURIER_SET_REQUEST_PREFERENCE: 'courier:setRequestPreference',
  COURIER_CUSTOM_REQUEST_PREFERENCE: 'courier:customRequestPreference',
  COURIER_MAX_CONCURRENT_SHARD_REQUESTS: 'courier:maxConcurrentShardRequests',
  COURIER_BATCH_SEARCHES: 'courier:batchSearches',
  SEARCH_INCLUDE_FROZEN: 'search:includeFrozen',
  SEARCH_TIMEOUT: 'search:timeout',
  HISTOGRAM_BAR_TARGET: 'histogram:barTarget',
  HISTOGRAM_MAX_BARS: 'histogram:maxBars',
  HISTORY_LIMIT: 'history:limit',
  SHORT_DOTS_ENABLE: 'shortDots:enable',
  FORMAT_DEFAULT_TYPE_MAP: 'format:defaultTypeMap',
  FORMAT_NUMBER_DEFAULT_PATTERN: 'format:number:defaultPattern',
  FORMAT_PERCENT_DEFAULT_PATTERN: 'format:percent:defaultPattern',
  FORMAT_BYTES_DEFAULT_PATTERN: 'format:bytes:defaultPattern',
  FORMAT_CURRENCY_DEFAULT_PATTERN: 'format:currency:defaultPattern',
  FORMAT_NUMBER_DEFAULT_LOCALE: 'format:number:defaultLocale',
  TIMEPICKER_REFRESH_INTERVAL_DEFAULTS: 'timepicker:refreshIntervalDefaults',
  TIMEPICKER_QUICK_RANGES: 'timepicker:quickRanges',
  TIMEPICKER_TIME_DEFAULTS: 'timepicker:timeDefaults',
  INDEXPATTERN_PLACEHOLDER: 'indexPattern:placeholder',
  FILTERS_PINNED_BY_DEFAULT: 'filters:pinnedByDefault',
  FILTERS_EDITOR_SUGGEST_VALUES: 'filterEditor:suggestValues',
  AUTOCOMPLETE_USE_TIMERANGE: 'autocomplete:useTimeRange',
} as const;
