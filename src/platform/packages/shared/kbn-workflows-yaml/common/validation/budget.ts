/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Work budget for one validation pass. The caller owns the object and reads
 * `exhausted` afterwards, so a pass can stop mid-way without changing what it
 * returns. Counting the work as it happens keeps the limit exact: a separate
 * pre-count is a guess about cost that drifts from what the pass really does.
 */
export interface ValidationBudget {
  /** Units of work left. A unit is one collected item or one for-loop scope. */
  remaining: number;
  /** Set only when a pass stopped early, so no results means "not checked". */
  exhausted: boolean;
}

export const createValidationBudget = (remaining: number): ValidationBudget => ({
  remaining,
  exhausted: false,
});

/** Takes one unit. Returns false when the caller must stop and marks the budget. */
export const spendBudgetUnit = (budget: ValidationBudget | undefined): boolean => {
  if (!budget) {
    return true;
  }
  if (budget.remaining <= 0) {
    budget.exhausted = true;
    return false;
  }
  budget.remaining--;
  return true;
};
