/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { ScopedModel } from '@kbn/agent-builder-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import { AGENT_BUILDER_FAST_INFERENCE_FEATURE_ID } from '@kbn/agent-builder-common/constants';
import type { FastInferenceEndpointsProvider } from '../types';

export const createScopedModel = async ({
  inference,
  request,
  connectorId,
}: {
  inference: InferenceServerStart;
  request: KibanaRequest;
  connectorId: string;
}): Promise<ScopedModel> => {
  const chatModel = await inference.getChatModel({ request, connectorId, chatModelOptions: {} });
  const inferenceClient = inference.getClient({ request, bindTo: { connectorId } });
  const connector = await inference.getConnectorById(connectorId, request);

  return { connector, chatModel, inferenceClient };
};

export const resolveConnectorId = async ({
  inference,
  request,
  searchInferenceEndpoints,
}: {
  inference: InferenceServerStart;
  request: KibanaRequest;
  searchInferenceEndpoints?: FastInferenceEndpointsProvider;
}): Promise<string | undefined> => {
  if (searchInferenceEndpoints) {
    try {
      const { endpoints } = await searchInferenceEndpoints.endpoints.getForFeature(
        AGENT_BUILDER_FAST_INFERENCE_FEATURE_ID,
        request
      );
      const recommended = endpoints.find((e) => e.isRecommended);
      if (recommended) {
        return recommended.connectorId;
      }
    } catch {
      // fall through to default connector
    }
  }

  try {
    const connector = await inference.getDefaultConnector(request);
    return connector?.connectorId;
  } catch {
    return undefined;
  }
};
