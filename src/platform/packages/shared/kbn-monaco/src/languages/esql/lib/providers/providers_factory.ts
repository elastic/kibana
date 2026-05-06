/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '../../../../monaco_imports';

export interface CreateProviderParams<T> {
  model: monaco.editor.ITextModel;
  run: (safeModel: monaco.editor.ITextModel) => T | Promise<T>;
  emptyResult: T;
}

export class DisposedModelAccessError extends Error {
  constructor() {
    super('DisposedModelAccessError');
    this.name = 'DisposedModelAccessError';
  }
}

/**
 * Creates a generic Provider for Monaco.
 * It executes the "run" function provided with a Proxied instance of the Monaco model.
 * If the providers tries to access the model after it has been disposed,
 * it will return the "emptyResult" instead of throwing an error.
 *
 * - Use safeModel for accessing any property or function of the model.
 * - Use the original model if you need to compare instances.
 */
export async function createMonacoProvider<T>({
  model,
  run,
  emptyResult,
}: CreateProviderParams<T>): Promise<T> {
  const safeModel = createDisposedSafeModel(model);
  try {
    const result = await Promise.resolve(run(safeModel));
    return model.isDisposed() ? emptyResult : result;
  } catch (error) {
    if (error instanceof DisposedModelAccessError) {
      return emptyResult;
    }
    throw error;
  }
}

/**
 * Wraps a Monaco text model so that any property access or method call after disposal throws a controlled error.
 */
export function createDisposedSafeModel(model: monaco.editor.ITextModel): monaco.editor.ITextModel {
  const handler: ProxyHandler<monaco.editor.ITextModel> = {
    get(target, prop, receiver) {
      // If accessing isDisposed, run the original function.
      if (prop === 'isDisposed') {
        return target.isDisposed.bind(target);
      }
      // Throw a controlled error if the model is disposed before calling any other property or function.
      assertModelIsUsable(target);
      const value = Reflect.get(target, prop, receiver) as unknown;
      if (typeof value === 'function') {
        return function (this: unknown, ...args: unknown[]) {
          assertModelIsUsable(target);
          return value.apply(target, args);
        };
      }
      return value;
    },
  };

  return new Proxy(model, handler) as monaco.editor.ITextModel;
}

function assertModelIsUsable(target: monaco.editor.ITextModel) {
  if (target.isDisposed()) {
    throw new DisposedModelAccessError();
  }
}
