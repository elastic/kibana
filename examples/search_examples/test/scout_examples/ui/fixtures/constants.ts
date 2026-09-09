/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const LOGSTASH_FUNCTIONAL_ARCHIVE =
  'x-pack/platform/test/fixtures/es_archives/logstash_functional';

export const LENS_BASIC_KBN_ARCHIVE =
  'x-pack/platform/test/functional/fixtures/kbn_archives/lens/lens_basic.json';

export const DATA_VIEW = 'logstash-*';

/** Absolute range covering logstash_functional fixture data (date-picker display format). */
export const LOGSTASH_TIME_RANGE = {
  from: 'Mar 1, 2015 @ 00:00:00.000',
  to: 'Nov 1, 2015 @ 00:00:00.000',
};

export const APP_ID = 'searchExamples';
