/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type DevToolsVariable } from './types';

export const editVariable = (newVariable: DevToolsVariable, variables: DevToolsVariable[]) => {
  return variables.map((variable: DevToolsVariable) => {
    return variable.id === newVariable.id ? newVariable : variable;
  });
};

export const deleteVariable = (variables: DevToolsVariable[], id: string) => {
  return variables.filter((v) => v.id !== id);
};

export const isValidVariableName = (name: string) => {
  /*
   * MUST avoid characters that get URL-encoded, because they'll result in unusable variable names.
   * Common variable names consist of letters, digits, and underscores and do not begin with a digit.
   * However, the ones beginning with a digit are still allowed here for backward compatibility.
   */
  return typeof name === 'string' && name.match(/^[a-zA-Z0-9_]+$/g) !== null;
};
