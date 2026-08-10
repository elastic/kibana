/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getConfiguration } from '@kbn/apm-config-loader';
import { resources } from '@elastic/opentelemetry-node/sdk';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import {
  ATTR_SERVICE_INSTANCE_ID,
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
} from '@opentelemetry/semantic-conventions/incubating';

/**
 * Unified function to build the OpenTelemetry resource for all services.
 * @param serviceName The service name used to look up APM config (defaults to 'kibana').
 * @returns The OpenTelemetry resource
 */
export function buildOtelResources(serviceName: string = 'kibana') {
  const resource = resources
    .detectResources({
      detectors: [
        resources.envDetector,
        resources.hostDetector,
        resources.osDetector,
        resources.processDetector,
      ],
    })
    .merge(resources.resourceFromAttributes(deriveAttributesFromApmConfig(serviceName)));
  // TODO: Merge resource from attributes from the telemetry config (when available)

  return resource;
}

/**
 * Derives OTel service resource attributes from the APM configuration that was
 * already loaded at bootstrap time.
 */
const deriveAttributesFromApmConfig = (serviceName: string): Record<string, string> => {
  // telemetry.sdk.language is always known for this Node.js process.
  const attrs: Record<string, string> = { 'telemetry.sdk.language': 'nodejs' };

  // TODO: Since we are deprecating `elastic.apm.*` settings, we should provide a way to set these attributes in the `telemetry.*` config.
  const apmConfig = getConfiguration(serviceName);
  if (!apmConfig) {
    return attrs;
  }
  if (apmConfig.serviceName) {
    attrs[ATTR_SERVICE_NAME] = String(apmConfig.serviceName);
  }
  if (apmConfig.serviceVersion) {
    attrs[ATTR_SERVICE_VERSION] = String(apmConfig.serviceVersion);
  }
  if (apmConfig.environment) {
    // Reverse-mapping APM Server transformations:
    // https://github.com/elastic/apm-data/blob/2f9cdbf722e5be5bf77d99fbcaab7a70a7e83fff/input/otlp/metadata.go#L69-L74
    attrs[ATTR_DEPLOYMENT_ENVIRONMENT_NAME] = String(apmConfig.environment);
  }
  const { globalLabels } = apmConfig;
  if (globalLabels && typeof globalLabels === 'object' && !Array.isArray(globalLabels)) {
    for (const [key, value] of Object.entries(globalLabels)) {
      if (value == null) continue;
      attrs[key] = String(value);
      // For backward compatibility, we prefix the global labels with "labels."
      attrs[`labels.${key}`] = String(value);
    }

    // The Kibana node UUID is stored in globalLabels.kibana_uuid by ApmConfiguration.
    // We surface it as service.instance.id per the OTel Resource semantic conventions.
    const kibanaUuid = globalLabels.kibana_uuid;
    if (kibanaUuid) {
      attrs[ATTR_SERVICE_INSTANCE_ID] = String(kibanaUuid);
    }
  }

  if (apmConfig.serviceNodeName) {
    // If the service node name is explicitly set, we use it as the service instance id.
    attrs[ATTR_SERVICE_INSTANCE_ID] = String(apmConfig.serviceNodeName);
  }
  return attrs;
};
