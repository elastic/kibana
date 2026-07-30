/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const DEFAULT_DATA_VIEW = 'logstash-*';

export const ES_ARCHIVES = {
  LOGSTASH: 'src/platform/test/functional/fixtures/es_archiver/logstash_functional',
  NO_TIME_FIELD:
    'src/platform/test/functional/fixtures/es_archiver/index_pattern_without_timefield',
};

export const KBN_ARCHIVES = {
  /**
   * Standard Discover archive. Loads the `logstash-*` data view and the other
   * saved objects most Discover specs rely on.
   */
  DISCOVER: 'src/platform/test/functional/fixtures/kbn_archiver/discover',
  /**
   * Saved searches exercising ES|QL column rendering.
   */
  DISCOVER_ESQL_COLUMNS: 'src/platform/test/functional/fixtures/kbn_archiver/discover_esql_columns',
  FLIGHTS_DATA_VIEW:
    'src/platform/test/functional/fixtures/kbn_archiver/kibana_sample_data_flights_index_pattern',
  INVALID_SCRIPTED_FIELD:
    'src/platform/test/functional/fixtures/kbn_archiver/invalid_scripted_field',
  NO_TIME_FIELD:
    'src/platform/test/functional/fixtures/kbn_archiver/index_pattern_without_timefield',
  DASHBOARD_DRILLDOWNS:
    'x-pack/platform/test/functional/fixtures/kbn_archives/dashboard_drilldowns/drilldowns',
  ECOMMERCE: 'x-pack/platform/test/functional/fixtures/kbn_archives/reporting/ecommerce.json',
};

/**
 * Use in single-threaded tests to set the default data view.
 * @example uiSettings.set({ defaultIndex: testData.DATA_VIEW_ID.ECOMMERCE });
 */
export const DATA_VIEW_ID = {
  ECOMMERCE: '5193f870-d861-11e9-a311-0fa548c5f953',
  LOGSTASH: DEFAULT_DATA_VIEW,
  NO_TIME_FIELD: 'c1e8af24-c7b7-4d9b-ab0e-e408c88d29c9',
};

/**
 * Use in parallel tests to set the default data view because IDs are generated
 * and cannot be hardcoded.
 * @example scoutSpace.uiSettings.setDefaultIndex(testData.DATA_VIEW_NAME.ECOMMERCE);
 */
export const DATA_VIEW_NAME = {
  ECOMMERCE: 'ecommerce',
  LOGSTASH: DEFAULT_DATA_VIEW,
  NO_TIME_FIELD: 'without-timefield',
};

export const SAVED_SEARCH_TITLE = 'A Saved Search';

export const SUGGESTIONS_COUNT_ASSERTION_MESSAGE = 'The query bar suggestions count should be';

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

export const LOGSTASH_OUT_OF_RANGE_DATES = {
  from: 'Mar 1, 2020 @ 00:00:00.000',
  to: 'Nov 1, 2020 @ 00:00:00.000',
};

export const DEFAULT_ROWS_PER_PAGE = 100;

export const DEFAULT_SAMPLE_SIZE = 500;
