/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { globalSetupHook, getSynthtraceClient } from '@kbn/scout';
import { createMetricsTestIndexIfNeeded } from '../fixtures/metrics_experience';
import { TRACES, richTrace, traceCorrelatedLogs } from '../fixtures/traces_experience';

globalSetupHook(
  'Setup Discover tests data',
  async ({ esClient, esArchiver, apiServices, config, log, kbnUrl }) => {
    // Logstash data for flyout stability tests
    log.debug(
      '[setup:logstash] loading logstash_functional ES data (only if it does not exist)...'
    );
    await esArchiver.loadIfNeeded(
      'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
    );
    log.debug('[setup:logstash] logstash_functional ES data ready');

    // Metrics Experience setup
    log.debug('[setup:metrics] creating metrics test index (only if it does not exist)...');
    const created = await createMetricsTestIndexIfNeeded(esClient);
    log.debug(
      created
        ? '[setup:metrics] metrics test index created successfully'
        : '[setup:metrics] metrics test index already exists, skipping'
    );

    // Traces Experience setup (not supported in serverless security - no Fleet/APM privileges)
    const hasFleetSupport = !(config.serverless && config.projectType === 'security');
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

      const logData = traceCorrelatedLogs({
        ...timeRange,
        traceId: correlationIds.richTraceId,
        transactionId: correlationIds.transactionId,
        dbSpanId: correlationIds.dbSpanId,
        processOrderSpanId: correlationIds.processOrderSpanId,
      });

      await logsEsClient.index(logData);
      log.debug('[setup:traces] Correlated log data indexed');
    }
  }
);
