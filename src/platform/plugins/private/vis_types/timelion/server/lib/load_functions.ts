/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import _ from 'lodash';
import processFunctionDefinition from './process_function_definition';
import { fitFunctions } from '../fit_functions';
import { seriesFunctions } from '../series_functions';

// Static module registry replaces the dynamic require() + globSync approach.
// This is compatible with ESM/Vite and avoids circular dependency issues.
const functionModules: Record<string, Record<string, any>> = {
  series_functions: seriesFunctions,
  'series_functions/': seriesFunctions,
  fit_functions: fitFunctions,
};

export default function loadFunctions(directory: string): Record<string, any> {
  const moduleMap = functionModules[directory];
  if (!moduleMap) {
    throw new Error(`Unknown function directory: ${directory}`);
  }

  // Fit functions are returned as-is (they're simple transform functions)
  if (directory === 'fit_functions') {
    return moduleMap;
  }

  // Process series functions through processFunctionDefinition to register aliases
  const functions: Record<string, any> = {};
  _.each(moduleMap, function (func) {
    _.assign(functions, processFunctionDefinition(func));
  });

  return functions;
}
