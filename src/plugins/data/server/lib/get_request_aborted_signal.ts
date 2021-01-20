/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Observable } from 'rxjs';
// @ts-ignore not typed
import { AbortController } from 'abortcontroller-polyfill/dist/cjs-ponyfill';

/**
 * A simple utility function that returns an `AbortSignal` corresponding to an `AbortController`
 * which aborts when the given request is aborted.
 * @param aborted$ The observable of abort events (usually `request.events.aborted$`)
 */
export function getRequestAbortedSignal(aborted$: Observable<void>): AbortSignal {
  const controller = new AbortController();
  aborted$.subscribe(() => controller.abort());
  return controller.signal;
}
