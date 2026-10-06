/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export declare const createPerformanceObsHook: () => () => Record<string, number>;
/**
 * A wrapper around performance.timerify which defined the name of the returned
 * wrapped function to help identify observed function types inside the `PerformanceObserver`.
 *
 * @param name name of the function used to track the performance of the function execution
 * @param fn the function to be wrapped by the performance.timerify method.
 * @returns
 */
export declare const perfTimerify: <T extends (...params: unknown[]) => unknown>(
  name: string,
  fn: T
) => T;
