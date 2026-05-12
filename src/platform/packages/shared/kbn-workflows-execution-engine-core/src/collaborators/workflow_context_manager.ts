/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StepContext } from '@kbn/workflows';

/**
 * Read/render side of the workflow context — what flow-control nodes need
 * to evaluate conditions and template strings against the current step
 * context.
 *
 * The plugin's concrete implementation also builds dependency information,
 * variable scopes, mocked test data, etc. None of that is part of this
 * contract; nodes only see read + render.
 */
export interface IWorkflowContextManager {
  /**
   * Returns the current step's full context (workflow + steps + variables).
   * Reads from execution state — pure with respect to the manager.
   */
  getContext(): StepContext;

  /**
   * Recursively resolves template expressions in any value. Strings get
   * Liquid-rendered against the current context; objects/arrays are walked.
   *
   * Optional `additionalContext` is merged into the rendering context.
   */
  renderValueAccordingToContext<T>(obj: T, additionalContext?: Record<string, unknown>): T;

  /**
   * Lower-level render that takes a caller-supplied context explicitly,
   * rather than building one from execution state.
   */
  renderValueWithContext<T>(
    obj: T,
    context: Record<string, unknown>,
    additionalContext?: Record<string, unknown>
  ): T;

  /**
   * Evaluates a Liquid expression (`{{ ... }}`) against the current context
   * and returns the result.
   *
   * Throws on invalid templates — callers must catch where appropriate.
   */
  evaluateExpressionInContext(template: string): unknown;
}
