/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
import { scriptsJavaScriptStepDefinition } from './javascript/javascript_step';
import type { RegisterInternalStepDefinitionsOptions } from './register_internal_step_definitions_options';
import type { ServerStepRegistry } from '../step_registry/step_registry';

export const registerInternalStepDefinitions = (
  serverStepRegistry: ServerStepRegistry,
  { experimentalSteps }: RegisterInternalStepDefinitionsOptions
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

  if (experimentalSteps.javaScriptStep) {
    serverStepRegistry.register(scriptsJavaScriptStepDefinition);
  }
};
