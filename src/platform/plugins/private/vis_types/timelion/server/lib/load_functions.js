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
import { seriesFunctions } from '../series_functions';
import { fitFunctions } from '../fit_functions';

const functionModules = {
  series_functions: seriesFunctions,
  // Handle trailing slash variant
  'series_functions/': seriesFunctions,
  fit_functions: fitFunctions,
};

export default function loadFunctions(directory) {
  const moduleMap = functionModules[directory];

  if (!moduleMap) {
    throw new Error(`Unknown function directory: ${directory}`);
  }

  // For fit_functions, return as-is (they're simple functions keyed by name)
  if (directory === 'fit_functions') {
    return moduleMap;
  }

  // For series_functions, process each function definition to handle aliases
  const functions = {};
  _.each(moduleMap, function (func) {
    _.assign(functions, processFunctionDefinition(func));
  });

  return functions;
}
