/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { MonoTypeOperatorFunction, queueScheduler, scheduled, from } from 'rxjs';
import { concatAll, distinctUntilChanged, skip } from 'rxjs';

export function distinctUntilChangedWithInitialValue<T>(
  initialValue: T | Promise<T>,
  compare?: (x: T, y: T) => boolean
): MonoTypeOperatorFunction<T> {
  return (input$) =>
    scheduled(
      [isPromise(initialValue) ? from(initialValue) : [initialValue], input$],
      queueScheduler
    ).pipe(concatAll(), distinctUntilChanged(compare), skip(1));
}

function isPromise<T>(value: T | Promise<T>): value is Promise<T> {
  return (
    !!value &&
    typeof value === 'object' &&
    'then' in value &&
    typeof value.then === 'function' &&
    !('subscribe' in value)
  );
}
