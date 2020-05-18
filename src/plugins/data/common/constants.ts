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
export const META_FIELDS_SETTING = 'metaFields';
export const DOC_HIGHLIGHT_SETTING = 'doc_table:highlight';
export const QUERY_STRING_OPTIONS_SETTINGS = 'query:queryString:options';
export const QUERY_ALLOW_LEADING_WILDCARDS_SETTINGS = 'query:allowLeadingWildcards';
export const SEARCH_QUERY_LANGUAGE_SETTINGS = 'search:queryLanguage';
export const SORT_OPTIONS_SETTINGS = 'sort:options';
export const COURIER_IGNORE_FILTER_IF_FIELD_NOT_IN_INDEX_SETTINGS =
  'courier:ignoreFilterIfFieldNotInIndex';
export const COURIER_SET_REQUEST_PREFERENCE_SETTINGS = 'courier:setRequestPreference';
export const COURIER_CUSTOM_REQUEST_PREFERENCE_SETTINGS = 'courier:customRequestPreference';
export const COURIER_MAX_CONCURRENT_SHARD_REQUESTS_SETTINGS = 'courier:maxConcurrentShardRequests';
export const COURIER_BATCH_SEARCHES_SETTINGS = 'courier:batchSearches';
export const SEARCH_INCLUDE_FROZEN_SETTINGS = 'search:includeFrozen';
export const HISTOGRAM_BAR_TARGET_SETTINGS = 'histogram:barTarget';
export const HISTOGRAM_MAX_BARS_SETTINGS = 'histogram:maxBars';
export const HISTORY_LIMIT_SETTINGS = 'history:limit';
export const SHORT_DOTS_ENABLE_SETTINGS = 'shortDots:enable';
export const FORMAT_DEFAULT_TYPE_MAP_SETTINGS = 'format:defaultTypeMap';
export const FORMAT_NUMBER_DEFAULT_PATTERN_SETTINGS = 'format:number:defaultPattern';
export const FORMAT_PERCENT_DEFAULT_PATTERN_SETTINGS = 'format:percent:defaultPattern';
export const FORMAT_BYTES_DEFAULT_PATTERN_SETTINGS = 'format:bytes:defaultPattern';
export const FORMAT_CURRENCY_DEFAULT_PATTERN_SETTINGS = 'format:currency:defaultPattern';
export const FORMAT_NUMBER_DEFAULT_LOCALE_SETTINGS = 'format:number:defaultLocale';
export const TIMEPICKER_REFRESH_INTERVAL_DEFAULTS_SETTINGS = 'timepicker:refreshIntervalDefaults';
export const TIMEPICKER_QUICK_RANGES_SETTINGS = 'timepicker:quickRanges';
export const INDEXPATTERN_PLACEHOLDER_SETTINGS = 'indexPattern:placeholder';
export const FILTERS_PINNED_BY_DEFAULT_SETTINGS = 'filters:pinnedByDefault';
export const FILTERS_EDITOR_SUGGEST_VALUES_SETTINGS = 'filterEditor:suggestValues';
