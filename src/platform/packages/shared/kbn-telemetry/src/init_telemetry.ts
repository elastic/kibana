/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { loadConfiguration } from '@kbn/apm-config-loader';
import { initTracing } from '@kbn/tracing';
import { initMetrics } from '@kbn/metrics';

import type { InstrumentaionsMap } from '@elastic/opentelemetry-node/types/instrumentations';
import { resources, getInstrumentations } from '@elastic/opentelemetry-node/sdk';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import {
  ATTR_SERVICE_INSTANCE_ID,
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
} from '@opentelemetry/semantic-conventions/incubating';

/**
 *
 * Initializes OpenTelemetry (currently only tracing)
 *
 * @param argv                Process arguments
 * @param rootDir             Root dir of Kibana repo
 * @param isDistributable     Whether this is a distributable build
 * @param serviceName         The service name used in resource attributes
 * @returns                   A function that can be called on shutdown and allows exporters to flush their queue.
 */
export const initTelemetry = (
  argv: string[],
  rootDir: string,
  isDistributable: boolean,
  serviceName: string
) => {
  const apmConfigLoader = loadConfiguration(argv, rootDir, isDistributable);

  const apmConfig = apmConfigLoader.getConfig(serviceName);
  const telemetryConfig = apmConfigLoader.getTelemetryConfig();
  const monitoringCollectionConfig = apmConfigLoader.getMonitoringCollectionConfig();

  // attributes.resource.*
  const resource = resources.resourceFromAttributes({
    [ATTR_SERVICE_NAME]: apmConfig.serviceName,
    [ATTR_SERVICE_VERSION]: apmConfig.serviceVersion,
    [ATTR_SERVICE_INSTANCE_ID]: apmConfig.serviceNodeName,
    // Reverse-mapping APM Server transformations:
    // https://github.com/elastic/apm-data/blob/2f9cdbf722e5be5bf77d99fbcaab7a70a7e83fff/input/otlp/metadata.go#L69-L74
    [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: apmConfig.environment,
    ...(apmConfig.globalLabels as Record<string, unknown>),
  });

  if (telemetryConfig.enabled) {
    const desiredInstrumentations = new Set<keyof InstrumentaionsMap>();

    if (telemetryConfig.tracing.enabled) {
      initTracing({ resource, tracingConfig: telemetryConfig.tracing });
    }

    if (telemetryConfig.metrics.enabled || monitoringCollectionConfig.enabled) {
      initMetrics({ resource, metricsConfig: telemetryConfig.metrics, monitoringCollectionConfig });

      // Uncomment the ones below when we clarify the performance impact of having them enabled
      // // HTTP Server and Client durations
      // desiredInstrumentations.add('@opentelemetry/instrumentation-http');
      // // Undici client's request duration
      // desiredInstrumentations.add('@opentelemetry/instrumentation-undici');
    }

    if (telemetryConfig.metrics.enabled) {
      // Provides metrics about the Event Loop, GC Collector, and Heap stats.
      desiredInstrumentations.add('@opentelemetry/instrumentation-runtime-node');
    }

    if (desiredInstrumentations.size > 0) {
      // register opted-in EDOT auto-instrumentations (node-runtime, http, hapi, and more)
      // https://www.elastic.co/docs/reference/opentelemetry/edot-sdks/nodejs/supported-technologies#instrumentations

      // We want to be selective for now to avoid potential conflicts with the Elastic APM agent (hapi is a good example)
      const instrumentations = getInstrumentations().filter((instrumentation) =>
        desiredInstrumentations.has(instrumentation.instrumentationName as keyof InstrumentaionsMap)
      );

      registerInstrumentations({ instrumentations });
    }
  }
};
