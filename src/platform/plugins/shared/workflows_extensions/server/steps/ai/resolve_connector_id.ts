/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { validate as validateUuid } from 'uuid';
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
      throw new Error('No default connector configured');
    }

    return defaultConnector.connectorId;
  }

  if (validateUuid(nameOrId)) {
    return nameOrId;
  }

  const allConnectors = await inferencePlugin.getConnectorList(kibanaRequest);

  const connector = allConnectors.find((c) => c.name === nameOrId);

  if (!connector) {
    throw new Error(`Connector with name ${nameOrId} not found`);
  }

  return connector.connectorId;
}
