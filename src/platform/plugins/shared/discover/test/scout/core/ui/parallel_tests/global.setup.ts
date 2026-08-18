/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { globalSetupHook } from '@kbn/scout';

globalSetupHook('Setup Discover core tests data', async ({ esArchiver, log }) => {
  log.debug('[setup:logstash] loading logstash_functional ES data (only if it does not exist)...');
  await esArchiver.loadIfNeeded(
    'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
  );
  log.debug('[setup:logstash] logstash_functional ES data ready');

  log.debug(
    '[setup:index_pattern_without_timefield] loading index_pattern_without_timefield ES data (only if it does not exist)...'
  );
  await esArchiver.loadIfNeeded(
    'src/platform/test/functional/fixtures/es_archiver/index_pattern_without_timefield'
  );
  log.debug(
    '[setup:index_pattern_without_timefield] index_pattern_without_timefield ES data ready'
  );

  // Long window logstash data for request_counts tests.
  log.debug(
    '[setup:long_window_logstash] loading long_window_logstash ES data (only if it does not exist)...'
  );
  await esArchiver.loadIfNeeded(
    'src/platform/test/functional/fixtures/es_archiver/long_window_logstash'
  );
  log.debug('[setup:long_window_logstash] long_window_logstash ES data ready');
});
