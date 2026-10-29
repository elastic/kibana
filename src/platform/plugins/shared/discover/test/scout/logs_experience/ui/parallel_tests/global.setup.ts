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

  const { logsEsClient } = await getSynthtraceClient('logsEsClient', {
    esClient,
    log,
    config,
  });

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

  // Doc-viewer data. Every document carries a stack trace and an oversized `log.level`, so every
  // row offers both leading controls and no spec needs a query to narrow the grid. One document per
  // minute keeps `@timestamp` unique, which makes "row 0" and "row 1" stable under the default sort.
  await logsEsClient.index([
    timerange(from, to)
      .interval('1m')
      .rate(1)
      .generator((timestamp: number) =>
        logDoc
          .create()
          .message(LOGS.SYNTH_LOGS_MESSAGE)
          .hostName(LOGS.SYNTH_LOGS_HOST)
          .timestamp(timestamp)
          .dataset(LOGS.SYNTH_DOCVIEWER_DATASET)
          .namespace(LOGS.SYNTH_LOGS_NAMESPACE)
          .logLevel(LOGS.OVERSIZED_LOG_LEVEL)
          .defaults({ 'error.stack_trace': LOGS.STACK_TRACE })
      ),
  ]);
  log.debug('[setup:logs] synthtrace doc viewer data indexed');

  // Logs without any message-like field, so the doc viewer has no Log overview tab for them.
  await logsEsClient.index([
    timerange(from, to)
      .interval('10m')
      .rate(1)
      .generator((timestamp: number) =>
        logDoc
          .create()
          .hostName(LOGS.SYNTH_LOGS_HOST)
          .timestamp(timestamp)
          .dataset(LOGS.SYNTH_NO_MESSAGE_DATASET)
          .namespace(LOGS.SYNTH_LOGS_NAMESPACE)
          .logLevel('info')
      ),
  ]);
  log.debug('[setup:logs] synthtrace no-message data indexed');

  // Three documents, one per minute, with the `log.level` / `service.name` pairs the row-indicator
  // and cell-renderer specs assert on. `SYNTH_CONTEXT_ROWS` is in grid order (newest first), so it
  // is walked backwards here: the generator emits oldest first.
  const contextRows = LOGS.SYNTH_CONTEXT_ROWS;
  await logsEsClient.index([
    timerange(from, from + contextRows.length * 60_000)
      .interval('1m')
      .rate(1)
      .generator((timestamp: number, index: number) =>
        logDoc
          .create()
          .message(LOGS.SYNTH_LOGS_MESSAGE)
          .hostName(LOGS.SYNTH_LOGS_HOST)
          .timestamp(timestamp)
          .dataset(LOGS.SYNTH_CONTEXT_DATASET)
          .namespace(LOGS.SYNTH_LOGS_NAMESPACE)
          .logLevel(contextRows[contextRows.length - 1 - index].logLevel)
          .service(contextRows[contextRows.length - 1 - index].serviceName)
      ),
  ]);
  log.debug('[setup:logs] synthtrace context-awareness data indexed');

  // More documents than two sample sizes, so "Load more" can be exercised twice: the footer reports
  // 500 loaded rows, then 1,000, and disappears once every document is loaded.
  const fetchMoreRate = LOGS.SYNTH_FETCH_MORE_DOCUMENT_COUNT / ((to - from) / 60_000);
  await logsEsClient.index([
    timerange(from, to)
      .interval('1m')
      .rate(fetchMoreRate)
      .generator((timestamp: number) =>
        logDoc
          .create()
          .message(LOGS.SYNTH_LOGS_MESSAGE)
          .hostName(LOGS.SYNTH_LOGS_HOST)
          .timestamp(timestamp)
          .dataset(LOGS.SYNTH_FETCH_MORE_DATASET)
          .namespace(LOGS.SYNTH_LOGS_NAMESPACE)
          .logLevel('info')
      ),
  ]);
  log.debug(
    `[setup:logs] synthtrace fetch-more data indexed (${LOGS.SYNTH_FETCH_MORE_DOCUMENT_COUNT} docs)`
  );

  // Metric-shaped data for the negative cases: a data source that must NOT match the logs
  // profile. Indexed directly rather than via `infraEsClient`, whose `metrics-*` data streams
  // are TSDB and reject timestamps outside a moving window around now.
  //
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

  // Non-logs documents with the fields the logs profile renders specially; see
  // `NON_LOGS_FIELDS_INDEX` for why they live apart from the metric-shaped index.
  await esClient.indices.create({
    index: LOGS.NON_LOGS_FIELDS_INDEX,
    mappings: {
      properties: {
        '@timestamp': { type: 'date' },
        'host.name': { type: 'keyword' },
        'log.level': { type: 'keyword' },
        'service.name': { type: 'keyword' },
        message: { type: 'text' },
      },
    },
  });

  const nonLogsFieldsDocuments = Array.from({ length: 10 }, (_, i) => ({
    '@timestamp': new Date(from + i * intervalMs).toISOString(),
    'host.name': LOGS.NON_LOGS_HOST,
    'log.level': LOGS.NON_LOGS_LOG_LEVEL,
    'service.name': LOGS.NON_LOGS_SERVICE_NAME,
    message: LOGS.NON_LOGS_MESSAGE,
  }));

  await esClient.bulk({
    index: LOGS.NON_LOGS_FIELDS_INDEX,
    refresh: true,
    operations: nonLogsFieldsDocuments.flatMap((doc) => [{ create: {} }, doc]),
  });
  log.debug(
    `[setup:logs] indexed ${nonLogsFieldsDocuments.length} docs into ${LOGS.NON_LOGS_FIELDS_INDEX}`
  );

  // Logs with a message but no `log.level` anywhere in the mapping, the negative case for the row
  // colour indicator. A plain index again, for the reason given on `NO_LOG_LEVEL_INDEX`.
  await esClient.indices.create({
    index: LOGS.NO_LOG_LEVEL_INDEX,
    mappings: {
      properties: {
        '@timestamp': { type: 'date' },
        'host.name': { type: 'keyword' },
        message: { type: 'text' },
      },
    },
  });

  const noLogLevelDocuments = Array.from({ length: 10 }, (_, i) => ({
    '@timestamp': new Date(from + i * intervalMs).toISOString(),
    'host.name': LOGS.SYNTH_LOGS_HOST,
    message: LOGS.SYNTH_LOGS_MESSAGE,
  }));

  await esClient.bulk({
    index: LOGS.NO_LOG_LEVEL_INDEX,
    refresh: true,
    operations: noLogLevelDocuments.flatMap((doc) => [{ create: {} }, doc]),
  });
  log.debug(
    `[setup:logs] indexed ${noLogLevelDocuments.length} docs into ${LOGS.NO_LOG_LEVEL_INDEX}`
  );
});
