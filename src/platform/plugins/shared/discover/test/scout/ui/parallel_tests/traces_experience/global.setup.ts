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
import { TRACES, simpleTrace } from '../../fixtures/traces_experience';

globalSetupHook(
  'Ingest trace data to Elasticsearch',
  async ({ apmSynthtraceEsClient, apiServices, config, log }) => {
    if (!config.isCloud) {
      await apiServices.fleet.internal.setup();
      log.debug('[setup] Fleet infrastructure setup completed');
      await apiServices.fleet.agent.setup();
      log.debug('[setup] Fleet agents setup completed');
    }

    const traceData: SynthtraceGenerator<ApmFields> = simpleTrace({
      from: new Date(TRACES.DEFAULT_START_TIME).getTime(),
      to: new Date(TRACES.DEFAULT_END_TIME).getTime(),
    });

    await apmSynthtraceEsClient.index(traceData);
    log.debug('[setup] APM trace data indexed');
  }
);
