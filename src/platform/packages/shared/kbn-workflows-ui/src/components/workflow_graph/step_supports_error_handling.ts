/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Whether a step type may expose step-level `on-failure` (error port + panel
 * Error handling section). Keep in sync with canvas port mounting — one predicate.
 *
 * TODO(engine): step-level on-failure on `if` (and other flow-control types
 * listed below) once the engine permits it.
 */
export function stepSupportsErrorHandling(stepType: string | undefined): boolean {
  if (!stepType) return false;
  // Flow-control / composite — deferred with the canvas error-port TODO(engine).
  if (
    stepType === 'if' ||
    stepType === 'foreach' ||
    stepType === 'parallel' ||
    stepType === 'while' ||
    stepType === 'merge' ||
    stepType === 'atomic'
  ) {
    return false;
  }
  return true;
}
