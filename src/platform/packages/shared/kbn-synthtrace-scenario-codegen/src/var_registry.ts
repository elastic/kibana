/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface VarRegistry {
  /** Returns the next unique variable name for a given prefix (e.g. `transaction1`). */
  next: (prefix: string) => string;
}

/**
 * Hands out monotonically increasing, collision-free variable names per prefix so
 * generated declarations like `const transaction1 = ...` stay unique within a module.
 */
export const createVarRegistry = (): VarRegistry => {
  const counters: Record<string, number> = {};
  return {
    next: (prefix) => {
      counters[prefix] = (counters[prefix] ?? 0) + 1;
      return `${prefix}${counters[prefix]}`;
    },
  };
};
