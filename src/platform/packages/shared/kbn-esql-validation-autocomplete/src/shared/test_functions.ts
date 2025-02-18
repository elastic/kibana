/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This file contains a mechanism for injecting test functions into the
 * validation tests. This allows us to use our own fixtures without relying
 * on the generated definitions provided by Elasticsearch.
 */

import { FunctionDefinition } from '../definitions/types';
let testFunctions: FunctionDefinition[] = [];

export const setTestFunctions = (functions: FunctionDefinition[]) => {
  testFunctions = functions;
};

export const getTestFunctions = () => {
  return testFunctions;
};
