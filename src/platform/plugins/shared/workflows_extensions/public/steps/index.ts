/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AiClassifyStepDefinition } from './ai/ai_classify_step';
import { AiPromptStepDefinition } from './ai/ai_prompt_step';
import { AiSummarizeStepDefinition } from './ai/ai_summarize_step';
import {
  dataDedupeStepDefinition,
  dataMapStepDefinition,
  dataRegexExtractStepDefinition,
  dataRegexReplaceStepDefinition,
} from './data';
import type { PublicStepRegistry } from '../step_registry';

export const registerInternalStepDefinitions = (stepRegistry: PublicStepRegistry) => {
  stepRegistry.register(dataMapStepDefinition);
  stepRegistry.register(dataDedupeStepDefinition);
  stepRegistry.register(dataRegexExtractStepDefinition);
  stepRegistry.register(dataRegexReplaceStepDefinition);
  stepRegistry.register(AiPromptStepDefinition);
  stepRegistry.register(AiSummarizeStepDefinition);
  stepRegistry.register(AiClassifyStepDefinition);
};
