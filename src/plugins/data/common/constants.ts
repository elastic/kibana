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

export const DEFAULT_QUERY_LANGUAGE = 'kuery';

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
} as const;
