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

  log.debug('[setup:hamlet] loading hamlet ES data (only if it does not exist)...');
  await esArchiver.loadIfNeeded('src/platform/test/functional/fixtures/es_archiver/hamlet');
  log.debug('[setup:hamlet] hamlet ES data ready');

  log.debug(
    '[setup:unmapped_fields] loading unmapped_fields ES data (only if it does not exist)...'
  );
  await esArchiver.loadIfNeeded(
    'src/platform/test/functional/fixtures/es_archiver/unmapped_fields'
  );
  log.debug('[setup:unmapped_fields] unmapped_fields ES data ready');

  log.debug(
    '[setup:index_pattern_without_timefield] loading index_pattern_without_timefield ES data (only if it does not exist)...'
  );
  await esArchiver.loadIfNeeded(
    'src/platform/test/functional/fixtures/es_archiver/index_pattern_without_timefield'
  );
  log.debug(
    '[setup:index_pattern_without_timefield] index_pattern_without_timefield ES data ready'
  );

  log.debug(
    '[setup:kibana_sample_data_flights] loading kibana_sample_data_flights ES data (only if it does not exist)...'
  );
  await esArchiver.loadIfNeeded(
    'src/platform/test/functional/fixtures/es_archiver/kibana_sample_data_flights'
  );
  log.debug('[setup:kibana_sample_data_flights] kibana_sample_data_flights ES data ready');

  // TSDB logs data for default_columns tests.
  log.debug(
    '[setup:kibana_sample_data_logs_tsdb] loading kibana_sample_data_logs_tsdb ES data (only if it does not exist)...'
  );
  await esArchiver.loadIfNeeded(
    'src/platform/test/functional/fixtures/es_archiver/kibana_sample_data_logs_tsdb'
  );
  log.debug('[setup:kibana_sample_data_logs_tsdb] kibana_sample_data_logs_tsdb ES data ready');

  // Long window logstash data for request_counts tests.
  log.debug(
    '[setup:long_window_logstash] loading long_window_logstash ES data (only if it does not exist)...'
  );
  await esArchiver.loadIfNeeded(
    'src/platform/test/functional/fixtures/es_archiver/long_window_logstash'
  );
  log.debug('[setup:long_window_logstash] long_window_logstash ES data ready');
});
