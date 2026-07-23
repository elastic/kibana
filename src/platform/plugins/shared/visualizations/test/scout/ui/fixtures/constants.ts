/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const ES_ARCHIVES = {
  LOGSTASH: 'src/platform/test/functional/fixtures/es_archiver/logstash_functional',
} as const;

export const KBN_ARCHIVES = {
  VISUALIZE: 'src/platform/test/functional/fixtures/kbn_archiver/visualize.json',
} as const;

export const DATA_VIEW = {
  LOGSTASH_TIME_BASED: 'logstash-*',
  LOGSTASH_NON_TIME_BASED: 'logstash*',
} as const;

/** Saved-object id of the default `logstash-*` index pattern in `visualize.json`. */
export const DEFAULT_INDEX_ID = 'logstash-*';

/** Byte format pattern applied by the legacy FTR suite (`format:bytes:defaultPattern`). */
export const BYTES_FORMAT_PATTERN = '0,0.[000]b';

/** Default absolute time range covering the logstash sample data. */
export const LOGSTASH_DEFAULT_TIME = {
  from: '2015-09-19T06:31:44.000Z',
  to: '2015-09-23T18:31:44.000Z',
} as const;

/**
 * Expected rows for a `bytes` histogram (interval 2000) data table over the
 * logstash sample data. Shared by the time-based and non-time-based suites.
 */
export const BYTES_HISTOGRAM_TABLE = [
  ['0B', '2,088'],
  ['1.953KB', '2,748'],
  ['3.906KB', '2,707'],
  ['5.859KB', '2,876'],
  ['7.813KB', '2,863'],
  ['9.766KB', '147'],
  ['11.719KB', '148'],
  ['13.672KB', '129'],
  ['15.625KB', '161'],
  ['17.578KB', '137'],
] as const;
