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

import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { getInstrumentations } from '@elastic/opentelemetry-node/sdk';

import { api, resources } from '@elastic/opentelemetry-node/sdk';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { ATTR_SERVICE_INSTANCE_ID, ATTR_SERVICE_NAMESPACE } from '@kbn/opentelemetry-attributes';

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

  // attributes.resource.*
  const resource = resources.resourceFromAttributes({
    [ATTR_SERVICE_NAME]: apmConfig.serviceName,
    [ATTR_SERVICE_VERSION]: apmConfig.serviceVersion,
    [ATTR_SERVICE_INSTANCE_ID]: apmConfig.serviceNodeName,
    [ATTR_SERVICE_NAMESPACE]: apmConfig.environment,
    ...(apmConfig.globalLabels as Record<string, unknown>),
  });

  if (telemetryConfig.enabled) {
    if (telemetryConfig.tracing.enabled) {
      initTracing({ resource, tracingConfig: telemetryConfig.tracing });
    }

    if (telemetryConfig.metrics.enabled) {
      initMetrics({ resource, metricsConfig: telemetryConfig.metrics });
    }

    if (telemetryConfig.metrics.enabled || telemetryConfig.tracing.enabled) {
      // register EDOT auto-instrumentations (node-runtime, http, hapi, and more)
      // https://www.elastic.co/docs/reference/opentelemetry/edot-sdks/nodejs/supported-technologies#instrumentations
      // Only register them if any of the metrics or tracing are enabled. Otherwise, there's no point in adding them (at least for now).
      registerInstrumentations({
        instrumentations: getInstrumentations(),
      });
    }
  }

  /** Testing bits below... to be removed before sending for review */

  // scope.name
  const meter = api.metrics.getMeter('my plugin');

  // metrics.my-own-counter: value
  const counter = meter.createCounter('my-own-counter');

  // metrics.my-own-counter: 1; attributes.myTag: myValue
  counter.add(1, { myTag: 'myValue' });

  // const log = console;
  //
  // api.diag.setLogger(
  //   {
  //     ...log,
  //     verbose: (...args: any[]) => log.trace(...args),
  //   },
  //   api.DiagLogLevel.INFO
  // );
};
