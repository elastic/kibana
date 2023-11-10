/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CustomRequestHandlerContext, KibanaRequest } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { RacApiRequestHandlerContext } from '@kbn/rule-registry-plugin/server';
import type { AIAssistantManagementObservabilityService } from '../service';
import type {
  AiAssistantManagementObservabilityPluginSetupDependencies,
  AiAssistantManagementObservabilityPluginStartDependencies,
} from '../types';

export type AIAssistantManagementObservabilityRequestHandlerContext = CustomRequestHandlerContext<{
  rac: RacApiRequestHandlerContext;
}>;

export interface AIAssistantManagementObservabilityRouteHandlerResources {
  request: KibanaRequest;
  context: AIAssistantManagementObservabilityRequestHandlerContext;
  logger: Logger;
  service: AIAssistantManagementObservabilityService;
  plugins: {
    [key in keyof AiAssistantManagementObservabilityPluginSetupDependencies]: {
      setup: Required<AiAssistantManagementObservabilityPluginSetupDependencies>[key];
    };
  } & {
    [key in keyof AiAssistantManagementObservabilityPluginStartDependencies]: {
      start: () => Promise<
        Required<AiAssistantManagementObservabilityPluginStartDependencies>[key]
      >;
    };
  };
}

export interface AIAssistantManagementObservabilityRouteCreateOptions {
  options: {
    timeout?: {
      idleSocket?: number;
    };
    tags: Array<'access:ai_assistant'>;
  };
}
