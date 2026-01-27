/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';

export async function resolveConnectorId(
  nameOrId: string | undefined,
  inferencePlugin: InferenceServerStart,
  kibanaRequest: KibanaRequest
): Promise<string> {
  if (!nameOrId) {
    const defaultConnector = await inferencePlugin.getDefaultConnector(kibanaRequest);

    if (!defaultConnector) {
      throw new Error('No default AI connector configured');
    }

    return defaultConnector.connectorId;
  }

  const allConnectors = await inferencePlugin.getConnectorList(kibanaRequest);

  if (!allConnectors.length) {
    throw new Error(`No AI connectors found.`);
  }

  const connector = allConnectors.find((c) => c.name === nameOrId || c.connectorId === nameOrId);

  if (!connector) {
    throw new Error(
      `AI Connector '${nameOrId}' not found. Available AI connectors: ${allConnectors
        .map((c) => `${c.name} (ID: ${c.connectorId})`)
        .join(', ')}`
    );
  }

  return connector.connectorId;
}
