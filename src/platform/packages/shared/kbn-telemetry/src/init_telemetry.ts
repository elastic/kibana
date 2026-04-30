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

import { maybeInitAutoInstrumentations } from './init_autoinstrumentations';
import { buildOtelResources } from './build_otel_resources';

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

  if (apmConfig.active !== false && telemetryConfig.tracing.enabled) {
    throw new Error(
      'Elastic APM and OpenTelemetry tracing cannot be enabled simultaneously.\n' +
        'To use OpenTelemetry tracing, disable APM by setting `elastic.apm.active: false` in your Kibana configuration.\n' +
        'To use Elastic APM, disable OpenTelemetry tracing by setting `telemetry.tracing.enabled: false`.'
    );
  }

  // resource.attributes.*
  const resource = buildOtelResources(serviceName);

  if (telemetryConfig.enabled) {
    if (telemetryConfig.tracing.enabled) {
      maybeInitAutoInstrumentations();
    }

    const asyncSettled = resource.waitForAsyncAttributes?.() ?? Promise.resolve();
    asyncSettled.then(() => {
      if (telemetryConfig.tracing.enabled) {
        initTracing({ resource, tracingConfig: telemetryConfig.tracing });
      }

      if (telemetryConfig.metrics.enabled || monitoringCollectionConfig.enabled) {
        initMetrics({
          resource,
          metricsConfig: telemetryConfig.metrics,
          monitoringCollectionConfig,
        });
      }
    });
  }
};
