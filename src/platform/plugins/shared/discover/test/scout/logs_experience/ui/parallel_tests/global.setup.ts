/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { log as logDoc, timerange } from '@kbn/synthtrace-client';
import { globalSetupHook } from '@kbn/scout';
import { getSynthtraceClient } from '@kbn/scout-synthtrace';
import { LOGSTASH_ES_ARCHIVE } from '../../../common/ui/fixtures/constants';
import { LOGS } from '../fixtures';

globalSetupHook(
  'Setup logs experience tests data',
  async ({ esArchiver, esClient, log, config }) => {
    // Provides a non-logs index (`logstash-*`) for specs that need a data view which must
    // not match the logs profile.
    await esArchiver.loadIfNeeded(LOGSTASH_ES_ARCHIVE);
    log.debug('[setup:logs] logstash_functional archive loaded');

    const from = new Date(LOGS.DEFAULT_START_TIME).getTime();
    const to = new Date(LOGS.DEFAULT_END_TIME).getTime();

    // Logs data: the data source that triggers the logs profile.
    const { logsEsClient } = await getSynthtraceClient('logsEsClient', {
      esClient,
      log,
      config,
    });

    await logsEsClient.index([
      timerange(from, to)
        .interval('1m')
        .rate(5)
        .generator((timestamp: number) =>
          logDoc
            .create()
            .message('Test log message for recommended fields')
            .timestamp(timestamp)
            .dataset(LOGS.SYNTH_LOGS_DATASET)
            .namespace(LOGS.SYNTH_LOGS_NAMESPACE)
            .logLevel('info')
            .defaults({
              'event.dataset': LOGS.SYNTH_LOGS_DATASET,
              'log.level': 'info',
            })
        ),
    ]);
    log.debug('[setup:logs] synthtrace logs data indexed');

    // Metric-shaped data for the negative cases: a data source that must NOT match the logs
    // profile. Indexed directly rather than via `infraEsClient`, whose `metrics-*` data streams
    // are TSDB and reject timestamps outside a moving window around now.
    await esClient.indices
      .create({
        index: LOGS.NON_LOGS_INDEX,
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            'host.name': { type: 'keyword' },
            'system.cpu.total.norm.pct': { type: 'float' },
            'system.memory.actual.used.pct': { type: 'float' },
          },
        },
      })
      .catch((err: Error) => {
        // Idempotent: the index survives an interrupted run that skipped teardown.
        if (!err.message.includes('resource_already_exists_exception')) throw err;
      });

    const intervalMs = 10 * 60 * 1000;
    const documents = Array.from({ length: 1 + (to - from) / intervalMs }, (_, i) => ({
      '@timestamp': new Date(from + i * intervalMs).toISOString(),
      'host.name': LOGS.NON_LOGS_HOST,
      'system.cpu.total.norm.pct': 0.98,
      'system.memory.actual.used.pct': 0.5,
    }));

    await esClient.bulk({
      index: LOGS.NON_LOGS_INDEX,
      refresh: true,
      operations: documents.flatMap((doc) => [{ create: {} }, doc]),
    });
    log.debug(`[setup:logs] indexed ${documents.length} docs into ${LOGS.NON_LOGS_INDEX}`);
  }
);
