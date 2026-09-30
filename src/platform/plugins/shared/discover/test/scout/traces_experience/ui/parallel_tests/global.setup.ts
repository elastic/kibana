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
  TRACES,
  richTrace,
  traceCorrelatedLogs,
  minimalTraceCorrelatedLogs,
  deepTrace,
  indexUnprocessedOtelTrace,
} from '../fixtures';

globalSetupHook(
  'Setup traces experience tests data',
  async ({ esClient, apiServices, config, log, kbnUrl }) => {
    const hasFleetSupport = !config.serverless || config.projectType === 'oblt';
    if (!hasFleetSupport) {
      log.debug('[setup:traces] skipping Fleet/APM setup (not supported in this environment)');
      return;
    }

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

    await indexUnprocessedOtelTrace(esClient, timeRange);
    log.debug('[setup:traces] Unprocessed OTel trace data indexed to traces-test.otel-default');
  }
);
