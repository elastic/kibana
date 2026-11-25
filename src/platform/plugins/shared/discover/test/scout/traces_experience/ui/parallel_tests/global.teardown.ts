/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { globalTeardownHook } from '@kbn/scout';
import { LATENCY_TRACE } from '../fixtures';

globalTeardownHook(
  'Teardown traces experience tests data',
  async ({ esClient, apiServices, log }) => {
    await apiServices.core
      .settings({
        'feature_flags.overrides': {
          'observability.tracesLatencyMapEnabled': null,
        },
      })
      .then(() => log.debug('[teardown:traces] feature flag overrides reset'))
      .catch((err) =>
        log.warning(`[teardown:traces] Failed to reset feature flag overrides: ${err.message}`)
      );

    await esClient.indices
      .deleteDataStream({ name: 'traces-test.otel-default' })
      .then(() => log.debug('[teardown:traces] Deleted traces-test.otel-default data stream'))
      .catch((err) =>
        log.warning(`[teardown:traces] Failed to delete traces-test.otel-default: ${err.message}`)
      );

    // The latency map fixtures share the APM streams with the other traces fixtures, under
    // their own service: taken out by service, so that a later run against the same cluster
    // does not count this run's spans twice.
    await esClient
      .deleteByQuery({
        index: 'traces-apm*',
        query: { term: { 'service.name': LATENCY_TRACE.SERVICE_NAME } },
        refresh: true,
        conflicts: 'proceed',
      })
      .then(() => log.debug(`[teardown:traces] Deleted ${LATENCY_TRACE.SERVICE_NAME} traces`))
      .catch((err) =>
        log.warning(
          `[teardown:traces] Failed to delete ${LATENCY_TRACE.SERVICE_NAME} traces: ${err.message}`
        )
      );
  }
);
