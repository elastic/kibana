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
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { REPO_ROOT } from '@kbn/repo-info';
import { AgentConfigOptions } from '@kbn/telemetry-config';
import { assign } from 'lodash';

interface InitTelemetryOptions {
  isDistributable?: boolean;
  agentConfig?: AgentConfigOptions;
}
/**
 *
 * Initializes OpenTelemetry tracing & metrics
 */

export const initTelemetry = (
  serviceName: string,
  { isDistributable = false, agentConfig }: InitTelemetryOptions = {}
) => {
  const apmConfigLoader = loadConfiguration(process.argv, REPO_ROOT, isDistributable);

  const apmConfig = assign(apmConfigLoader.getConfig(serviceName), agentConfig ?? {});

  const telemetryConfig = apmConfigLoader.getTelemetryConfig();

  // explicitly check for enabled == false, as the default in the schema
  // is true, but it's not parsed through @kbn/config-schema, so the
  // default value is not returned
  const telemetryEnabled = telemetryConfig?.enabled !== false;

  // tracing is enabled only when telemetry is enabled and tracing is not disabled
  const tracingEnabled = telemetryEnabled && telemetryConfig?.tracing?.enabled;

  const metricsEnabled = telemetryEnabled && telemetryConfig?.metrics?.enabled;

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: apmConfig.serviceName,
    [ATTR_SERVICE_VERSION]: apmConfig.serviceVersion,
  });

  if (metricsEnabled) {
    initMetrics({
      metricsConfig: telemetryConfig.metrics,
      apmConfig,
      resource,
    });
  }

  if (tracingEnabled) {
    initTracing({
      tracingConfig: telemetryConfig.tracing,
      apmConfig,
      resource,
    });
  }
};
