/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLCallbacks } from '@kbn/esql-types';
import type { monaco } from '../../../../monaco_imports';

export interface MonacoProviderContext {
  signal: AbortSignal;
}

export interface CreateProviderParams<T, TCallbacks extends ESQLCallbacks | undefined = undefined> {
  model: monaco.editor.ITextModel;
  callbacks?: TCallbacks;
  token?: monaco.CancellationToken;
  run: (
    safeModel: monaco.editor.ITextModel,
    callbacks: TCallbacks,
    context: MonacoProviderContext
  ) => T | Promise<T>;
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
export async function createMonacoProvider<
  T,
  TCallbacks extends ESQLCallbacks | undefined = undefined
>({ model, callbacks, token, run, emptyResult }: CreateProviderParams<T, TCallbacks>): Promise<T> {
  const safeModel = createDisposedSafeModel(model);
  const abortController = new AbortController();
  const cancellationListener = token?.onCancellationRequested(() => {
    abortController.abort();
  });

  if (token?.isCancellationRequested) {
    abortController.abort();
  }

  try {
    if (abortController.signal.aborted) {
      return emptyResult;
    }

    const cancellableCallbacks = createCancellableCallbacks(
      callbacks as TCallbacks,
      abortController.signal
    );
    const result = await Promise.resolve(
      run(safeModel, cancellableCallbacks, {
        signal: abortController.signal,
      })
    );
    return model.isDisposed() || abortController.signal.aborted ? emptyResult : result;
  } catch (error) {
    if (error instanceof DisposedModelAccessError) {
      return emptyResult;
    }
    if (abortController.signal.aborted) {
      return emptyResult;
    }
    throw error;
  } finally {
    cancellationListener?.dispose();
  }
}

function createCancellableCallbacks<TCallbacks extends ESQLCallbacks | undefined>(
  callbacks: TCallbacks,
  signal: AbortSignal
): TCallbacks {
  if (!callbacks) {
    return callbacks;
  }

  return Object.fromEntries(
    Object.entries(callbacks).map(([key, value]) => {
      if (typeof value !== 'function') {
        return [key, value];
      }

      return [
        key,
        function (this: unknown, ...args: unknown[]) {
          return value.apply(this, [...args, signal]);
        },
      ];
    })
  ) as TCallbacks;
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
