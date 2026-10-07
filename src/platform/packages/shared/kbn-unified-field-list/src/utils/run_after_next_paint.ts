/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Runs the callback once the browser has painted the next frame, which allows to defer
 * expensive work until an urgent UI update is visible. Returns a function to cancel the run.
 */
export const runAfterNextPaint = (callback: () => void): (() => void) => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  // `requestAnimationFrame` callbacks run right before the next paint,
  // so a task scheduled from there runs after the frame has been painted
  const frameId = requestAnimationFrame(() => {
    timeoutId = setTimeout(callback, 0);
  });

  return () => {
    cancelAnimationFrame(frameId);
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  };
};
