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

import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { getInstrumentations } from '@elastic/opentelemetry-node/sdk';

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

  // explicitly check for enabled == false, as the default in the schema
  // is true, but it's not parsed through @kbn/config-schema, so the
  // default value is not returned
  const telemetryEnabled = telemetryConfig?.enabled !== false;

  // tracing is enabled only when telemetry is enabled and tracing is not disabled
  const tracingEnabled = telemetryEnabled && telemetryConfig?.tracing?.enabled;

  if (!tracingEnabled) {
    return async () => {};
  }

  // register EDOT auto-instrumentations (node-runtime, http, hapi, and more)
  // https://www.elastic.co/docs/reference/opentelemetry/edot-sdks/nodejs/supported-technologies#instrumentations
  registerInstrumentations({
    instrumentations: getInstrumentations(),
  });

  return initTracing({
    tracingConfig: telemetryConfig.tracing,
    apmConfig,
  });
};
