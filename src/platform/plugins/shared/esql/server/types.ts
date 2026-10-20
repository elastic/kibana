/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ESQLExtensionsRegistry } from './extensions_registry';

export interface EsqlServerPluginSetup {
  getExtensionsRegistry: () => ESQLExtensionsRegistry;
}

// Should be SearchInferenceEndpointsPluginStart from @kbn/search-inference-endpoints/server but I cant use it due to circular dependency.
export interface FastInferenceEndpointsProvider {
  endpoints: {
    getForFeature: (
      featureId: string,
      request: KibanaRequest
    ) => Promise<{ endpoints: Array<{ connectorId: string; isRecommended?: boolean }> }>;
  };
}

export interface EsqlServerPluginStart {
  inference: InferenceServerStart;
  actions: ActionsPluginStart;
  searchInferenceEndpoints?: FastInferenceEndpointsProvider;
}
