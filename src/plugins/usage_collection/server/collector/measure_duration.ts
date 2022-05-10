/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { PerformanceObserver, performance } from 'perf_hooks';

export const createPerformanceObsHook = () => {
  const marks: Record<string, number> = {};
  const obs = new PerformanceObserver((items) => {
    console.log('items.getEntries()::', items.getEntries())
    for (const { duration, name } of items.getEntries()) {
      marks[name] = duration;
    }

    performance.clearMarks();
  });

  obs.observe({ entryTypes: ['function'] });

  // teardown function returns the marked measurements.
  // returning the data after teardown ensures that we proprely teardown
  // the observer.
  return () => {
    obs.disconnect();
    return marks;
  }
}
