/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Error thrown while compiling a workflow definition into its execution graph
 * (e.g. an unsupported construct inside a parallel branch). Carries the
 * offending `stepId` so callers — notably the editor's validation layer — can
 * anchor the message to the specific step in the YAML instead of failing with
 * a generic "document not loaded" error.
 */
export class GraphBuildError extends Error {
  /** Step id (workflow `name`) the error relates to, when known. */
  public readonly stepId?: string;

  constructor(message: string, stepId?: string) {
    super(message);
    this.name = 'GraphBuildError';
    this.stepId = stepId;
    // Restore prototype chain for instanceof to work after transpilation to ES5.
    Object.setPrototypeOf(this, GraphBuildError.prototype);
  }
}

/** Type guard for {@link GraphBuildError}. */
export function isGraphBuildError(error: unknown): error is GraphBuildError {
  return error instanceof GraphBuildError;
}
