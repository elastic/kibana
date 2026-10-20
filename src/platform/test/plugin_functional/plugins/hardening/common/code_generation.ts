/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface CodeGenerationResult {
  eval: { blocked: boolean; error?: string };
  functionConstructor: { blocked: boolean; error?: string };
}

export function tryCodeGeneration(): CodeGenerationResult {
  const result: CodeGenerationResult = {
    eval: { blocked: false },
    functionConstructor: { blocked: false },
  };

  try {
    eval('1+1'); // eslint-disable-line no-eval
  } catch (e) {
    result.eval = { blocked: true, error: e.message };
  }

  try {
    new Function('return 1+1')(); // eslint-disable-line no-new-func
  } catch (e) {
    result.functionConstructor = { blocked: true, error: e.message };
  }

  return result;
}
