/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { evaluateKql } from '@kbn/eval-kql';

export interface SafeEvaluateKqlResult {
  matched: boolean;
  error?: Error;
}

/**
 * Evaluates a KQL condition against a context without throwing.
 *
 * Returns `{ matched: false, error }` on any evaluation failure so callers get
 * a consistent shape and can observe failures through their own logging/telemetry
 * channel rather than catching and swallowing exceptions ad-hoc.
 *
 * Both `evaluateCondition` (flow-control) and `workflowMatchesTriggerCondition`
 * (trigger filtering) delegate here so error-handling semantics cannot drift
 * between the two callers.
 */
export const safeEvaluateKql = (
  condition: string,
  context: Record<string, unknown>
): SafeEvaluateKqlResult => {
  try {
    return { matched: evaluateKql(condition, context) };
  } catch (error) {
    return { matched: false, error: error instanceof Error ? error : new Error(String(error)) };
  }
};
