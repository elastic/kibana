/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Debounce a function till next animation frame
 * @param fn
 */
export function onRaf(fn: Function) {
  let req: number | null;
  return (...args: unknown[]) => {
    if (req) window.cancelAnimationFrame(req);
    req = window.requestAnimationFrame(() => {
      req = null;
      fn(...args);
    });
  };
}
