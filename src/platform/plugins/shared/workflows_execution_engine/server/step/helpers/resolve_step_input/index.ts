/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

interface ResolveStepInputContextManager {
  renderValueAccordingToContext<T>(value: T): T;
}

/** Pure: renders the step's `with` configuration through the workflow context. */
export const resolveStepInput = (
  withConfig: Record<string, unknown> | undefined,
  contextManager: ResolveStepInputContextManager
): Record<string, unknown> => {
  const withData = withConfig ?? {};
  return contextManager.renderValueAccordingToContext(withData);
};
