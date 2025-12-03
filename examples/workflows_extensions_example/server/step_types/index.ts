/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ServerStepDefinition,
  WorkflowsExtensionsServerPluginSetup,
} from '@kbn/workflows-extensions/server';
import { setVarStepDefinition } from './setvar_step';

export const registerStepDefinitions = (
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup
) => {
  // serVarStepDefinition is strictly typed with infered input and output from handler,
  // but registerStepDefinition expects a ServerStepDefinition, which uses the CommonStepDefinition type,
  // resulting "Type 'unknown' is not assignable to type '{ variables: Record<string, string | number | boolean>; }'"
  workflowsExtensions.registerStepDefinition(setVarStepDefinition as ServerStepDefinition);
};
