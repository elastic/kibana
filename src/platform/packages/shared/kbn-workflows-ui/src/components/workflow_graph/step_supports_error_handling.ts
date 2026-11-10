/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Whether a step type may expose step-level `on-failure` as a fallback error port on the canvas.
 * Keep in sync with canvas port mounting — one predicate. The panel's Error handling section
 * uses {@link stepSupportsErrorHandlingSettings}, which also takes loops.
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

/**
 * Whether the step panel offers the Error handling section (step-level retry / continue). Loops
 * take it: the engine runs `on-failure` around the whole loop. Their canvas node has no fallback
 * port yet, so the canvas keeps using {@link stepSupportsErrorHandling}.
 */
export function stepSupportsErrorHandlingSettings(stepType: string | undefined): boolean {
  return stepType === 'foreach' || stepType === 'while' || stepSupportsErrorHandling(stepType);
}
