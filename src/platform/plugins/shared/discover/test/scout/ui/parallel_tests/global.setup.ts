/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { globalSetupHook } from '@kbn/scout';
import type { ApmFields, SynthtraceGenerator } from '@kbn/synthtrace-client';
import { createMetricsTestIndexIfNeeded } from '../fixtures/metrics_experience';
import { TRACES, simpleTrace, richTrace } from '../fixtures/traces_experience';

globalSetupHook(
  'Setup Discover tests data',
  async ({ esClient, apmSynthtraceEsClient, apiServices, config, log }) => {
    // Metrics Experience setup
    log.debug('[setup:metrics] creating metrics test index (only if it does not exist)...');
    const created = await createMetricsTestIndexIfNeeded(esClient);
    log.debug(
      created
        ? '[setup:metrics] metrics test index created successfully'
        : '[setup:metrics] metrics test index already exists, skipping'
    );

    // Traces Experience setup
    if (!config.isCloud) {
      await apiServices.fleet.internal.setup();
      log.debug('[setup:traces] Fleet infrastructure setup completed');
      await apiServices.fleet.agent.setup();
      log.debug('[setup:traces] Fleet agents setup completed');
    }

    const timeRange = {
      from: new Date(TRACES.DEFAULT_START_TIME).getTime(),
      to: new Date(TRACES.DEFAULT_END_TIME).getTime(),
    };

    const traceData: SynthtraceGenerator<ApmFields> = simpleTrace(timeRange);
    await apmSynthtraceEsClient.index(traceData);
    log.debug('[setup:traces] APM simple trace data indexed');

    const { apmData: richApmData } = richTrace(timeRange);
    await apmSynthtraceEsClient.index(richApmData);
    log.debug('[setup:traces] APM rich trace data indexed');
  }
);
