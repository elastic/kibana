/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { InferenceConnector } from '@kbn/inference-common';
import {
  isSupportedConnector,
  connectorToInference,
  InferenceConnectorType,
} from '@kbn/inference-common';

export const getConnectorList = async ({
  actions,
  request,
}: {
  actions: ActionsPluginStart;
  request: KibanaRequest;
}): Promise<InferenceConnector[]> => {
  const actionClient = await actions.getActionsClientWithRequest(request);

  const allConnectors = await actionClient.getAll({
    includeSystemActions: false,
  });

  return allConnectors
    .filter((connector) => isSupportedConnector(connector))
    .map(connectorToInference);
};

export const getDefaultConnector = ({ connectors }: { connectors: InferenceConnector[] }) => {
  //
  const inferenceConnector = connectors.find(
    (connector) => connector.type === InferenceConnectorType.Inference
  );
  if (inferenceConnector) {
    return inferenceConnector;
  }

  const openAIConnector = connectors.find(
    (connector) => connector.type === InferenceConnectorType.OpenAI
  );
  if (openAIConnector) {
    return openAIConnector;
  }

  return connectors[0];
};
