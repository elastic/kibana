/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { globalSetupHook } from '@kbn/scout';
import { getSynthtraceClient } from '@kbn/scout-synthtrace';
import {
  createMetricsTestIndexIfNeeded,
  DIMENSIONS_WIPE_CONFIG,
} from '../fixtures/metrics_experience';
import {
  TRACES,
  richTrace,
  traceCorrelatedLogs,
  minimalTraceCorrelatedLogs,
  deepTrace,
} from '../fixtures/traces_experience';

globalSetupHook(
  'Setup Discover tests data',
  async ({ esClient, esArchiver, apiServices, config, log, kbnUrl }) => {
    // Turn "isEsqlDefault" off by default for all tests
    log.debug('[setup:discover] turning off isEsqlDefault by default for all tests');
    await apiServices.core.settings({
      'feature_flags.overrides': {
        'discover.isEsqlDefault': false,
      },
    });

    // Logstash data for flyout stability tests
    log.debug(
      '[setup:logstash] loading logstash_functional ES data (only if it does not exist)...'
    );
    await esArchiver.loadIfNeeded(
      'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
    );
    log.debug('[setup:logstash] logstash_functional ES data ready');

    // Huge fields data for Discover sidebar virtualization coverage
    const hugeFieldsIndex = 'testhuge';
    const hugeFieldCount = 11_000;
    const hugeFieldsExists = await esClient.indices.exists({ index: hugeFieldsIndex });

    if (!hugeFieldsExists) {
      log.debug('[setup:huge_fields] creating testhuge index with high-field-count document...');
      await esClient.indices.create({
        index: hugeFieldsIndex,
        settings: {
          index: {
            mapping: {
              total_fields: {
                limit: 50_000,
              },
            },
            number_of_replicas: 0,
            number_of_shards: 1,
          },
        },
        mappings: {
          properties: {
            date: {
              type: 'date',
            },
          },
        },
      });

      const doc: Record<string, number | string> = {
        date: '2016-10-05T14:00:00',
      };

      for (let i = 0; i <= hugeFieldCount; i++) {
        doc[`myvar${i}`] = i;
      }

      await esClient.index({
        index: hugeFieldsIndex,
        id: '1',
        document: doc,
        refresh: 'wait_for',
      });

      log.debug('[setup:huge_fields] testhuge index ready');
    } else {
      log.debug('[setup:huge_fields] testhuge index already exists, skipping');
    }

    // Metrics Experience setup
    log.debug('[setup:metrics] creating metrics test index (only if it does not exist)...');
    const created = await createMetricsTestIndexIfNeeded(esClient);
    log.debug(
      created
        ? '[setup:metrics] metrics test index created successfully'
        : '[setup:metrics] metrics test index already exists, skipping'
    );

    // Companion index for stream-switch coverage
    log.debug(
      '[setup:metrics] creating companion metrics test index (only if it does not exist)...'
    );
    const createdOther = await createMetricsTestIndexIfNeeded(esClient, DIMENSIONS_WIPE_CONFIG);
    log.debug(
      createdOther
        ? '[setup:metrics] companion metrics test index created successfully'
        : '[setup:metrics] companion metrics test index already exists, skipping'
    );

    // Traces Experience setup (not supported in serverless security or search - no Fleet/APM privileges)
    const hasFleetSupport = !config.serverless || config.projectType === 'oblt';
    if (hasFleetSupport) {
      if (!config.isCloud) {
        await apiServices.fleet.internal.setup();
        log.debug('[setup:traces] Fleet infrastructure setup completed');
        await apiServices.fleet.agent.setup();
        log.debug('[setup:traces] Fleet agents setup completed');
      }

      const { apmEsClient } = await getSynthtraceClient('apmEsClient', {
        esClient,
        kbnUrl: kbnUrl.get(),
        log,
        config,
      });

      const { logsEsClient } = await getSynthtraceClient('logsEsClient', {
        esClient,
        log,
        config,
      });

      const timeRange = {
        from: new Date(TRACES.DEFAULT_START_TIME).getTime(),
        to: new Date(TRACES.DEFAULT_END_TIME).getTime(),
      };

      const { apmData, correlationIds } = richTrace(timeRange);

      await apmEsClient.index(apmData);
      log.debug('[setup:traces] Rich APM trace data indexed');

      await apmEsClient.index(deepTrace(timeRange));
      log.debug('[setup:traces] Deep trace data indexed');

      const logData = traceCorrelatedLogs({
        ...timeRange,
        traceId: correlationIds.richTraceId,
        transactionId: correlationIds.transactionId,
        dbSpanId: correlationIds.dbSpanId,
        processOrderSpanId: correlationIds.processOrderSpanId,
      });

      await logsEsClient.index(logData);
      log.debug('[setup:traces] Correlated log data indexed');

      const minimalLogData = minimalTraceCorrelatedLogs({
        ...timeRange,
        traceId: correlationIds.minimalTraceId,
        transactionId: correlationIds.minimalTransactionId,
      });

      await logsEsClient.index(minimalLogData);
      log.debug('[setup:traces] Minimal trace log data indexed');
    }
  }
);
