/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { KibanaRequest } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { InferenceConnector } from '@kbn/inference-common';
import {
  isSupportedConnector,
  connectorToInference,
  InferenceConnectorType,
} from '@kbn/inference-common';
export interface GetIndexMappingEntry {
  mappings: MappingTypeMapping;
}

export const cleanupMapping = (mapping: MappingTypeMapping): MappingTypeMapping => {
  const recurseKeys = ['properties', 'fields'];
  const fieldsToKeep = ['type', 'dynamic', '_meta', 'meta', 'briefing', 'description', 'enabled'];

  function recursiveCleanup(obj: Record<string, any>): Record<string, any> {
    if (Array.isArray(obj)) {
      return obj.map((item) => recursiveCleanup(item));
    } else if (obj !== null && typeof obj === 'object') {
      const cleaned: Record<string, any> = {};

      for (const key of Object.keys(obj)) {
        if (recurseKeys.includes(key)) {
          const value = obj[key];
          if (value !== null && typeof value === 'object') {
            // For properties/fields: preserve all keys inside
            const subCleaned: Record<string, any> = {};
            for (const fieldName of Object.keys(value)) {
              subCleaned[fieldName] = recursiveCleanup(value[fieldName]);
            }
            cleaned[key] = subCleaned;
          }
        } else if (fieldsToKeep.includes(key)) {
          cleaned[key] = recursiveCleanup(obj[key]);
        }
      }

      return cleaned;
    } else {
      return obj;
    }
  }

  return recursiveCleanup(mapping);
};

export type GetIndexMappingsResult = Record<string, GetIndexMappingEntry>;

export const getIndexMappings = async ({
  indices,
  cleanup = true,
  esClient,
}: {
  indices: string[];
  cleanup?: boolean;
  esClient: ElasticsearchClient;
}): Promise<GetIndexMappingsResult> => {
  const response = await esClient.indices.getMapping({
    index: indices,
  });

  return Object.entries(response).reduce((res, [indexName, mappingRes]) => {
    res[indexName] = {
      mappings: cleanup ? cleanupMapping(mappingRes.mappings) : mappingRes.mappings,
    };
    return res;
  }, {} as GetIndexMappingsResult);
};

/**
 * Temporary here, they need to be exposed from inference
 */

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
