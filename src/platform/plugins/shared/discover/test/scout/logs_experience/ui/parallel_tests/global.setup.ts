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
import { deleteLogsExperienceData, LOGS } from '../fixtures';

globalSetupHook('Setup logs experience tests data', async ({ esClient, log, config }) => {
  const from = new Date(LOGS.DEFAULT_START_TIME).getTime();
  const to = new Date(LOGS.DEFAULT_END_TIME).getTime();

  // Logs data: the data source that triggers the logs profile.
  const { logsEsClient } = await getSynthtraceClient('logsEsClient', {
    esClient,
    log,
    config,
  });

  // Seeding is delete-then-create so a re-run against a long-lived stack produces the same
  // state as a fresh one. Without this, indexing appends and doc counts drift on every run,
  // which would silently break count-dependent assertions. Scoped to this suite's own resources
  // rather than `logsEsClient.clean()`, which resolves `logs-*-*` and would delete data seeded by
  // any other suite sharing the stack.
  await deleteLogsExperienceData(esClient);

  await logsEsClient.index([
    timerange(from, to)
      .interval('1m')
      .rate(5)
      .generator((timestamp: number) =>
        logDoc
          .create()
          .message(LOGS.SYNTH_LOGS_MESSAGE)
          .hostName(LOGS.SYNTH_LOGS_HOST)
          .timestamp(timestamp)
          .dataset(LOGS.SYNTH_LOGS_DATASET)
          .namespace(LOGS.SYNTH_LOGS_NAMESPACE)
          .logLevel('info')
      ),
  ]);
  log.debug('[setup:logs] synthtrace logs data indexed');

  // Metric-shaped data for the negative cases: a data source that must NOT match the logs
  // profile. Indexed directly rather than via `infraEsClient`, whose `metrics-*` data streams
  // are TSDB and reject timestamps outside a moving window around now.
  //
  // Already deleted above, for the same reason as the logs data: a leftover index from an
  // interrupted run would otherwise accumulate duplicate documents on the bulk below.
  await esClient.indices.create({
    index: LOGS.NON_LOGS_INDEX,
    mappings: {
      properties: {
        '@timestamp': { type: 'date' },
        'host.name': { type: 'keyword' },
        'system.cpu.total.norm.pct': { type: 'float' },
        'system.memory.actual.used.pct': { type: 'float' },
      },
    },
  });

  // 31 docs at a 2-minute interval over the 1 h window. EuiDataGrid hides the whole pagination row
  // when rowCount < min(pageSizeOptions), so this must stay above ROWS_PER_PAGE_OPTIONS[0] = 10; it
  // stays below 100 so the default rows-per-page still fits on a single page.
  const intervalMs = 2 * 60 * 1000;
  const documents = Array.from({ length: 31 }, (_, i) => ({
    '@timestamp': new Date(from + i * intervalMs).toISOString(),
    'host.name': 'synth-metrics-host-01',
    'system.cpu.total.norm.pct': 0.98,
    'system.memory.actual.used.pct': 0.5,
  }));

  await esClient.bulk({
    index: LOGS.NON_LOGS_INDEX,
    refresh: true,
    operations: documents.flatMap((doc) => [{ create: {} }, doc]),
  });
  log.debug(`[setup:logs] indexed ${documents.length} docs into ${LOGS.NON_LOGS_INDEX}`);
});
