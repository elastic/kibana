/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const ES_ARCHIVES = {
  LOGSTASH_FUNCTIONAL: 'src/platform/test/functional/fixtures/es_archiver/logstash_functional',
  LONG_WINDOW_LOGSTASH: 'src/platform/test/functional/fixtures/es_archiver/long_window_logstash',
};

export const KBN_ARCHIVES = {
  VISUALIZE: 'src/platform/test/functional/fixtures/kbn_archiver/visualize.json',
};

export const DEFAULT_START_TIME_UTC = '2015-09-19T06:31:44.000Z';
export const DEFAULT_END_TIME_UTC = '2015-09-23T18:31:44.000Z';

export const UI_SETTINGS = {
  DEFAULT_INDEX: 'logstash-*',
  FORMAT_BYTES_DEFAULT_PATTERN: '0,0.[000]b',
  HISTOGRAM_MAX_BARS: 100,
};
