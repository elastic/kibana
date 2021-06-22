/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { InterpreterRenderHandlers, RenderMode } from './types';

function on<T>(this: T, event: keyof T, fn: (...args: any) => void): void {
  const eventCall = this[event];
  if (typeof eventCall !== 'function') return;

  const updatedEvent = (...args: unknown[]) => {
    const preventFromCallingListener: void | boolean = eventCall(...args);
    if (typeof fn === 'function' && !preventFromCallingListener) {
      fn(...args);
    }
    return preventFromCallingListener;
  };
  this[event] = (updatedEvent as unknown) as typeof eventCall;
}

export function getDefaultHandlers<T>(): InterpreterRenderHandlers<T> {
  const handlers = {
    done() {},
    onDestroy(fn: () => void) {},
    reload() {},
    update(params: any) {},
    event(event: any) {},
    getRenderMode() {
      return 'noInteractivity' as RenderMode;
    },
    isSyncColorsEnabled() {
      return false;
    },
    on,
  } as InterpreterRenderHandlers<T>;

  return handlers;
}
