/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Standard `kbn_archiver/discover` archive. Loads the `logstash-*` data view
 * and the other saved objects most Discover specs rely on.
 */
export const DISCOVER_KBN_ARCHIVE = 'src/platform/test/functional/fixtures/kbn_archiver/discover';

export const DATE_NESTED_KBN_ARCHIVE =
  'src/platform/test/functional/fixtures/kbn_archiver/date_nested';

export const DATE_NESTED_ES_ARCHIVE =
  'src/platform/test/functional/fixtures/es_archiver/date_nested';

export const DATE_NANOS_MIXED_ES_ARCHIVE =
  'src/platform/test/functional/fixtures/es_archiver/date_nanos_mixed';

export const DATE_NANOS_MIXED_KBN_ARCHIVE =
  'src/platform/test/functional/fixtures/kbn_archiver/date_nanos_mixed.json';

export const DATE_NANOS_MIXED_DATA_VIEW = 'timestamp-*';

export const LONG_WINDOW_LOGSTASH_ES_ARCHIVE =
  'src/platform/test/functional/fixtures/es_archiver/long_window_logstash';

export const LONG_WINDOW_LOGSTASH_KBN_ARCHIVE =
  'src/platform/test/functional/fixtures/kbn_archiver/long_window_logstash_index_pattern';

export const LONG_WINDOW_LOGSTASH_DATA_VIEW = 'long-window-logstash-*';

export const FLIGHTS_KBN_ARCHIVE =
  'src/platform/test/functional/fixtures/kbn_archiver/kibana_sample_data_flights_index_pattern';

export const MANY_FIELDS_ES_ARCHIVE =
  'src/platform/test/functional/fixtures/es_archiver/many_fields';

export const MANY_FIELDS_KBN_ARCHIVE =
  'src/platform/test/functional/fixtures/kbn_archiver/many_fields_data_view';

export const INDEX_PATTERN_WITHOUT_TIMEFIELD_ES_ARCHIVE =
  'src/platform/test/functional/fixtures/es_archiver/index_pattern_without_timefield';

export const INDEX_PATTERN_WITHOUT_TIMEFIELD_KBN_ARCHIVE =
  'src/platform/test/functional/fixtures/kbn_archiver/index_pattern_without_timefield';

export const LOGSTASH_ES_ARCHIVE =
  'src/platform/test/functional/fixtures/es_archiver/logstash_functional';

/**
 * Loads the `with-timefield` and `without-timefield` data views. The matching ES
 * data is ingested by the Discover core global setup, so specs only need the
 * saved objects. Use {@link NO_TIME_FIELD_DATA_VIEW} to select the latter.
 */
export const WITHOUT_TIMEFIELD_KBN_ARCHIVE =
  'src/platform/test/functional/fixtures/kbn_archiver/index_pattern_without_timefield';

/** Data view from {@link WITHOUT_TIMEFIELD_KBN_ARCHIVE} that has no time field. */
export const NO_TIME_FIELD_DATA_VIEW = 'without-timefield';

/**
 * Saved searches exercising ES|QL column rendering (initial/custom columns for
 * transformational and non-transformational commands).
 */
export const DISCOVER_ESQL_COLUMNS_KBN_ARCHIVE =
  'src/platform/test/functional/fixtures/kbn_archiver/discover_esql_columns';

/**
 * Dashboard with a Lens ES|QL panel driven by an `esqlControl` options-list
 * control ({@link ESQL_CONTROLS_DASHBOARD_ID} / {@link ESQL_CONTROLS_CONTROL_ID}).
 */
export const ESQL_CONTROLS_DASHBOARD_KBN_ARCHIVE =
  'src/platform/test/functional/fixtures/kbn_archiver/dashboard/current/esql_controls';

/**
 * ID of the ES|QL control in {@link ESQL_CONTROLS_DASHBOARD_KBN_ARCHIVE}. Lives
 * inside the dashboard's `controlGroupInput`, so it survives the saved-object
 * import even though the dashboard itself gets a fresh ID.
 */
export const ESQL_CONTROLS_CONTROL_ID = 'esql-control-1';

/**
 * Discover session ("ESQL control unlink test") with a `geo.dest` ES|QL control
 * pre-selected to `AE`.
 */
export const SESSION_WITH_CONTROL_KBN_ARCHIVE =
  'src/platform/test/functional/fixtures/kbn_archiver/discover/session_with_control';

/** Title of the only saved search in {@link SESSION_WITH_CONTROL_KBN_ARCHIVE}. */
export const SESSION_WITH_CONTROL_TITLE = 'ESQL control unlink test';

/**
 * Dashboard holding {@link SESSION_WITH_CONTROL_TITLE} as an unlinked **by-value**
 * `discover_session` panel plus the matching `esql_control` panel. Replaces the
 * UI-driven "add from library, then unlink" setup the FTR suite used.
 */
export const ESQL_CONTROLS_BY_VALUE_DASHBOARD_KBN_ARCHIVE =
  'src/platform/test/functional/fixtures/kbn_archiver/dashboard/current/esql_controls_by_value';

export const DEFAULT_DATA_VIEW = 'logstash-*';

export const SAVED_SEARCH_TITLE = 'A Saved Search';

export const LOGSTASH_AVAILABLE_FIELD_COUNT = 49;
export const LOGSTASH_META_FIELD_COUNT = 4;

export const LOGSTASH_ESQL_AVAILABLE_FIELD_COUNT = 77;
export const LOGSTASH_ESQL_EMPTY_FIELD_COUNT = 6;

/**
 * Default time range that covers the `logstash_functional` fixture data.
 * Matches the FTR `timePicker.setDefaultAbsoluteRangeViaUiSettings()` values.
 *
 * ISO format, for the `uiSettings.setDefaultTime()` API. The date-picker UI
 * (`datePicker.setAbsoluteRange()`) needs the same instants in the picker's
 * display format instead, see {@link DEFAULT_TIME_RANGE_DISPLAY}.
 */
export const DEFAULT_TIME_RANGE = {
  from: '2015-09-19T06:31:44.000Z',
  to: '2015-09-23T18:31:44.000Z',
};

/**
 * {@link DEFAULT_TIME_RANGE} expressed in the date-picker display format, for
 * driving the time-picker UI (e.g. resetting a tab's range via the picker).
 */
export const DEFAULT_TIME_RANGE_DISPLAY = {
  from: 'Sep 19, 2015 @ 06:31:44.000',
  to: 'Sep 23, 2015 @ 18:31:44.000',
};

export const DEFAULT_ROWS_PER_PAGE = 100;

export const DEFAULT_SAMPLE_SIZE = 500;
