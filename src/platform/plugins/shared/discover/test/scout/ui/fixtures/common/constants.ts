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

/**
 * Saved-objects archive for the `long-window-logstash-*` data view used by
 * the histogram interval-scaling / DST tests.
 */
export const LONG_WINDOW_LOGSTASH_KBN_ARCHIVE =
  'src/platform/test/functional/fixtures/kbn_archiver/long_window_logstash_index_pattern';

export const LONG_WINDOW_LOGSTASH_DATA_VIEW = 'long-window-logstash-*';

export const DEFAULT_DATA_VIEW = 'logstash-*';

/**
 * Default time range that covers the `logstash_functional` fixture data.
 * Matches the FTR `timePicker.setDefaultAbsoluteRangeViaUiSettings()` values.
 */
export const DEFAULT_TIME_RANGE = {
  from: '2015-09-19T06:31:44.000Z',
  to: '2015-09-23T18:31:44.000Z',
};

/**
 * Human-readable form of {@link DEFAULT_TIME_RANGE} as rendered by the
 * Kibana time picker (matches FTR `timePicker.defaultStartTime/EndTime`).
 * Useful for asserting on `datePicker.getTimeConfig()` output.
 */
export const DEFAULT_TIME_RANGE_DISPLAY = {
  start: 'Sep 19, 2015 @ 06:31:44.000',
  end: 'Sep 23, 2015 @ 18:31:44.000',
};
