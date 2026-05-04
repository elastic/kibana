/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup } from '@kbn/core/server';
import { createAiWorkflowStepDefinitions } from '@kbn/inference-plugin/server';
import {
  dataAggregateStepDefinition,
  dataConcatStepDefinition,
  dataDedupeStepDefinition,
  dataFilterStepDefinition,
  dataFindStepDefinition,
  dataMapStepDefinition,
  dataParseJsonStepDefinition,
  dataRegexExtractStepDefinition,
  dataRegexReplaceStepDefinition,
  dataStringifyJsonStepDefinition,
} from './data';
import type { ServerStepRegistry } from '../step_registry/step_registry';
import type { WorkflowsExtensionsServerPluginStartDeps } from '../types';

export const registerInternalStepDefinitions = (
  core: CoreSetup<WorkflowsExtensionsServerPluginStartDeps>,
  serverStepRegistry: ServerStepRegistry
) => {
  serverStepRegistry.register(dataMapStepDefinition);
  serverStepRegistry.register(dataDedupeStepDefinition);
  serverStepRegistry.register(dataFilterStepDefinition);
  serverStepRegistry.register(dataFindStepDefinition);
  serverStepRegistry.register(dataRegexExtractStepDefinition);
  serverStepRegistry.register(dataRegexReplaceStepDefinition);
  serverStepRegistry.register(dataAggregateStepDefinition);
  serverStepRegistry.register(dataConcatStepDefinition);
  serverStepRegistry.register(dataParseJsonStepDefinition);
  serverStepRegistry.register(dataStringifyJsonStepDefinition);

  // AI steps are owned by the inference plugin; register their definitions here
  // since workflowsExtensions is the step registry and inference depends on it
  for (const aiStepDef of createAiWorkflowStepDefinitions(core)) {
    serverStepRegistry.register(aiStepDef);
  }
};
