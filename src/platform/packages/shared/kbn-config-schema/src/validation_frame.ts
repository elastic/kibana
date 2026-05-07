/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Implicit validation context (sibling refs, lazy registry, etc.).
 *
 * Implemented with a synchronous stack instead of `async_hooks`/`AsyncLocalStorage`
 * so the package can be bundled for the browser (Lens embeddable config validation).
 * Kibana's `@kbn/config-schema` validation paths run synchronously per request
 * (no `await` inside `validate`), which preserves correctness across concurrent HTTP
 * handlers on the Node event loop.
 */

export interface ValidationFrame {
  readonly context: Record<string, unknown>;
  siblingRoot: unknown | undefined;
  readonly lazyRegistry: ReadonlyMap<string, unknown>;
}

const stack: ValidationFrame[] = [];

export function runWithValidationFrame<T>(frame: ValidationFrame, fn: () => T): T {
  stack.push(frame);
  try {
    return fn();
  } finally {
    stack.pop();
  }
}

export function getValidationFrame(): ValidationFrame | undefined {
  const depth = stack.length;
  return depth === 0 ? undefined : stack[depth - 1];
}
