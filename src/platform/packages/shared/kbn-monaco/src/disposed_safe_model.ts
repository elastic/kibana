/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from './monaco_imports';

/** Thrown when code touches a disposed model through {@link createDisposedSafeModel}. */
export class DisposedModelAccessError extends Error {
  constructor() {
    super('DisposedModelAccessError');
    this.name = 'DisposedModelAccessError';
  }
}

function assertModelUsable(target: monaco.editor.ITextModel) {
  if (target.isDisposed()) {
    throw new DisposedModelAccessError();
  }
}

/**
 * Wraps a text model so that any property access or method call after disposal throws
 * {@link DisposedModelAccessError} instead of Monaco's `Error: Model is disposed!`.
 * {@link monaco.editor.ITextModel#isDisposed} remains readable without throwing.
 */
export function createDisposedSafeModel(model: monaco.editor.ITextModel): monaco.editor.ITextModel {
  const handler: ProxyHandler<monaco.editor.ITextModel> = {
    get(target, prop, receiver) {
      if (prop === 'isDisposed') {
        return target.isDisposed.bind(target);
      }
      assertModelUsable(target);
      const value = Reflect.get(target, prop, receiver) as unknown;
      if (typeof value === 'function') {
        return function (this: unknown, ...args: unknown[]) {
          assertModelUsable(target);
          return value.apply(target, args);
        };
      }
      return value;
    },
  };

  return new Proxy(model, handler) as monaco.editor.ITextModel;
}

export function isDisposedModelAccessError(error: unknown): error is DisposedModelAccessError {
  return error instanceof DisposedModelAccessError;
}

export interface WithDisposedSafeModelParams<T> {
  model: monaco.editor.ITextModel;
  run: (safeModel: monaco.editor.ITextModel) => T | Promise<T>;
  emptyResult: T;
}

/**
 * Runs `fn` with a {@link createDisposedSafeModel} wrapper. If the model is used after
 * disposal (via the proxy), returns `emptyResult` instead of propagating. Callers should use
 * the provided `safeModel` for all model access; using the outer Monaco `model` can still throw
 * Monaco's own `Model is disposed!` error, which is not caught here.
 */
export async function createProvider<T>({
  model,
  run,
  emptyResult,
}: WithDisposedSafeModelParams<T>): Promise<T> {
  const safeModel = createDisposedSafeModel(model);
  try {
    return await Promise.resolve(run(safeModel));
  } catch (error) {
    if (isDisposedModelAccessError(error)) {
      return emptyResult;
    }
    throw error;
  }
}
