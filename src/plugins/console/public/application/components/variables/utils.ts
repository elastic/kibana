/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import uuid from 'uuid';
import type { DevToolsVariable } from './variables_flyout';

export const editVariable = (
  name: string,
  value: string,
  id: string,
  variables: DevToolsVariable[]
) => {
  const index = variables.findIndex((v) => v.id === id);

  if (index === -1) {
    return variables;
  }

  return [
    ...variables.slice(0, index),
    { ...variables[index], [name]: value },
    ...variables.slice(index + 1),
  ];
};

export const deleteVariable = (variables: DevToolsVariable[], id: string) => {
  return variables.filter((v) => v.id !== id);
};

export const generateEmptyVariableField = (): DevToolsVariable => ({
  id: uuid.v4(),
  name: '',
  value: '',
});
