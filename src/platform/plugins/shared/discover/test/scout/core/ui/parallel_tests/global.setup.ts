/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { globalSetupHook } from '@kbn/scout';
import { globalSetupHookWithSynthtrace } from '@kbn/scout-synthtrace';
import { log as synthtraceLog, timerange } from '@kbn/synthtrace-client';
import {
  DATE_NANOS_MIXED_ES_ARCHIVE,
  LONG_WINDOW_LOGSTASH_ES_ARCHIVE,
} from '../../../common/ui/fixtures/constants';

const testRunId = process.env.TEST_RUN_ID;
if (!testRunId) {
  throw new Error('TEST_RUN_ID is required for the legacy log stream data namespace');
}

globalSetupHook('Setup Discover core tests data', async ({ esArchiver, log }) => {
  log.debug('[setup:logstash] loading logstash_functional ES data (only if it does not exist)...');
  await esArchiver.loadIfNeeded(
    'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
  );
  log.debug('[setup:logstash] logstash_functional ES data ready');

  log.debug(
    '[setup:kibana_sample_data_flights] loading kibana_sample_data_flights ES data (only if it does not exist)...'
  );
  await esArchiver.loadIfNeeded(
    'src/platform/test/functional/fixtures/es_archiver/kibana_sample_data_flights'
  );
  log.debug('[setup:kibana_sample_data_flights] kibana_sample_data_flights ES data ready');

  log.debug(
    '[setup:long_window_logstash] loading long_window_logstash ES data (only if it does not exist)...'
  );
  await esArchiver.loadIfNeeded(LONG_WINDOW_LOGSTASH_ES_ARCHIVE);
  log.debug('[setup:long_window_logstash] long_window_logstash ES data ready');

  log.debug(
    '[setup:date_nanos_mixed] loading date_nanos_mixed ES data (only if it does not exist)...'
  );
  await esArchiver.loadIfNeeded(DATE_NANOS_MIXED_ES_ARCHIVE);
  log.debug('[setup:date_nanos_mixed] date_nanos_mixed ES data ready');
});

globalSetupHookWithSynthtrace(
  'Setup legacy log stream embeddable data',
  { tag: '@local-stateful-classic' },
  async ({ log, logsSynthtraceEsClient }) => {
    const now = Date.now();

    log.debug('[setup:legacy_log_stream] indexing synthtrace logs...');
    await logsSynthtraceEsClient.index(
      timerange(now - 30 * 60 * 1000, now + 30 * 60 * 1000)
        .interval('1m')
        .rate(5)
        .generator((timestamp) =>
          synthtraceLog
            .create()
            .message('This is a log message')
            .timestamp(timestamp)
            .dataset('synth.discover')
            .namespace(testRunId)
            .logLevel('info')
            .defaults({
              'service.name': 'synth-discover',
            })
        )
    );
    log.debug('[setup:legacy_log_stream] synthtrace logs ready');
  }
);
