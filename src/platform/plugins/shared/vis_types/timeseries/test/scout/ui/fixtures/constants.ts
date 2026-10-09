/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const PLATFORM_ES_ARCHIVER_DIR = 'src/platform/test/functional/fixtures/es_archiver';
const PLATFORM_KBN_ARCHIVER_DIR = 'src/platform/test/functional/fixtures/kbn_archiver';

export const ES_ARCHIVE_PATHS = {
  LOGSTASH: `${PLATFORM_ES_ARCHIVER_DIR}/logstash_functional`,
  LONG_WINDOW_LOGSTASH: `${PLATFORM_ES_ARCHIVER_DIR}/long_window_logstash`,
} as const;

/**
 * Provides the `logstash-*` data view (including the `hello_world_runtime_field`
 * runtime field used by the annotations tests) and `long-window-logstash-*`.
 */
export const KBN_ARCHIVE_PATHS = {
  VISUALIZE: `${PLATFORM_KBN_ARCHIVER_DIR}/visualize.json`,
} as const;

export const DATA_VIEW_TITLE = {
  LOGSTASH: 'logstash-*',
  LONG_WINDOW_LOGSTASH: 'long-window-logstash-*',
} as const;

/** Time range the expected metric and chart values were recorded against. */
export const LOGSTASH_TIME_RANGE = {
  from: 'Sep 19, 2015 @ 06:31:44.000',
  to: 'Sep 22, 2015 @ 18:31:44.000',
} as const;

export const UI_SETTINGS = {
  'dateFormat:tz': 'UTC',
  'format:bytes:defaultPattern': '0,0.[000]b',
  'histogram:maxBars': 100,
} as const;

export const ALLOW_STRING_INDICES_SETTING = 'metrics:allowStringIndices';

/**
 * The migrated FTR suite only ran against a local stateful classic deployment, so
 * the literal tag is used instead of `tags.stateful.classic`, which would also
 * schedule the specs on Elastic Cloud hosted.
 */
export const TSVB_DEPLOYMENT_TAGS = ['@local-stateful-classic'];
