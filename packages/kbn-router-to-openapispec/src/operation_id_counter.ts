/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type OperationIdCounter = (name: string) => string;

export const createOperationIdCounter = () => {
  const operationIdCounters = new Map<string, number>();
  return (name: string): string => {
    name = encodeURIComponent(name);
    // Aliases an operationId to ensure it is unique across
    // multiple method+path combinations sharing a name.
    // "search" -> "search#0", "search#1", etc.
    const operationIdCount = operationIdCounters.get(name) ?? 0;
    const aliasedName = name + '#' + operationIdCount.toString();
    operationIdCounters.set(name, operationIdCount + 1);
    return aliasedName;
  };
};
