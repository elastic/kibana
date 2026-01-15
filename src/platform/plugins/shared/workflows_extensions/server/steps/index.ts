/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup } from '@kbn/core/server';
import { aiPromptStepDefinition } from './ai/ai_prompt_step';
import {
  dataDedupeStepDefinition,
  dataMapStepDefinition,
  dataRegexExtractStepDefinition,
  dataRegexReplaceStepDefinition,
} from './data';
import type { ServerStepRegistry } from '../step_registry/step_registry';
import type { WorkflowsExtensionsServerPluginStartDeps } from '../types';

export const registerInternalStepDefinitions = (
  core: CoreSetup<WorkflowsExtensionsServerPluginStartDeps>,
  serverStepRegistry: ServerStepRegistry
) => {
  serverStepRegistry.register(dataMapStepDefinition);
  serverStepRegistry.register(dataDedupeStepDefinition);
  serverStepRegistry.register(dataRegexExtractStepDefinition);
  serverStepRegistry.register(dataRegexReplaceStepDefinition);
  serverStepRegistry.register(aiPromptStepDefinition(core));
};
