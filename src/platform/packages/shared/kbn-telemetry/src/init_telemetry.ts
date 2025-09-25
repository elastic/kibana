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

import { resources } from '@elastic/opentelemetry-node/sdk';
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

    // From https://opentelemetry.io/docs/specs/semconv/resource/process/
    'process.pid': process.pid,
    'process.runtime.name': 'nodejs',
    'process.runtime.version': process.version,

    ...(apmConfig.globalLabels as Record<string, unknown>),
  });

  if (telemetryConfig.enabled) {
    if (telemetryConfig.tracing.enabled) {
      initTracing({ resource, tracingConfig: telemetryConfig.tracing });
    }

    if (telemetryConfig.metrics.enabled || monitoringCollectionConfig.enabled) {
      initMetrics({ resource, metricsConfig: telemetryConfig.metrics, monitoringCollectionConfig });
    }
  }
};
