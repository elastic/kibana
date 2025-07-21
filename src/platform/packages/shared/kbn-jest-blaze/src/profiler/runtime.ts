/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { JestProfilerRuntime } from './types';
import { wrapRequire as wrapRequireImpl } from './wrap_require';

const g: typeof globalThis = globalThis;

export const PROFILER_RUNTIME_KEY = `__JEST_PROFILER_RUNTIME`;

function createProfilerRuntime(): JestProfilerRuntime {
  const timings = {
    // the amount of time processing this file. Should only happen once per run.
    totalProcessTime: new Map<string, number>(),
    // the total amount of time executing this file. Happens once per test
    totalExecuteTime: new Map<string, number>(),
    // the amount of times the file was executed
    totalExecuteCount: new Map<string, number>(),
    // the total amount of files directly required while executing the file
    totalDirectRequires: new Map<string, number>(),
    // the total amount of files required (direct + indirect) while executing the file
    totalRequires: new Map<string, number>(),
    // the total amount of time spent requiring other modules while executing the file
    totalRequireTime: new Map<string, number>(),
    // the last require stack for each file (up to 5 ancestors: parent -> grandparent -> ...)
    lastRequireStack: new Map<string, string[]>(),
  };

  const stack: string[] = [];

  return {
    get timings() {
      return {
        totalProcessTime: new Map(timings.totalProcessTime),
        totalExecuteTime: new Map(timings.totalExecuteTime),
        totalExecuteCount: new Map(timings.totalExecuteCount),
        totalDirectRequires: new Map(timings.totalDirectRequires),
        totalRequires: new Map(timings.totalRequires),
        totalRequireTime: new Map(timings.totalRequireTime),
        lastRequireStack: new Map(timings.lastRequireStack),
      };
    },
    process(filename, cb) {
      const start = performance.now();

      stack.push(filename);

      try {
        return cb();
      } finally {
        stack.pop();
        const end = performance.now();
        timings.totalProcessTime.set(filename, end - start);
      }
    },
    execute(filename, origRequire, cb) {
      const start = performance.now();
      const topThis = this;

      // Push the executing file onto the stack so nested require() calls
      // correctly attribute direct require counts/time to this parent file
      stack.push(filename);

      try {
        // Increment execute count
        const prevCount = timings.totalExecuteCount.get(filename) ?? 0;
        timings.totalExecuteCount.set(filename, prevCount + 1);

        const wrappedRequire = wrapRequireImpl(origRequire, filename);
        return cb.call(topThis, wrappedRequire);
      } finally {
        const end = performance.now();
        const executeTime = end - start;

        // Pop after execution completes
        stack.pop();

        // Track total execute time
        const prevTime = timings.totalExecuteTime.get(filename) ?? 0;
        timings.totalExecuteTime.set(filename, prevTime + executeTime);
      }
    },
    require(filename, cb) {
      const start = performance.now();

      // Get current parent (last on stack) before pushing current file
      const parent = stack[stack.length - 1];
      stack.push(filename);

      try {
        return cb();
      } finally {
        const end = performance.now();
        stack.pop();

        const requireTime = end - start;

        // Only increment the direct parent's require count and time
        if (parent) {
          // Increment direct require count for the direct parent
          const prevDirectRequires = timings.totalDirectRequires.get(parent) ?? 0;
          timings.totalDirectRequires.set(parent, prevDirectRequires + 1);

          // Add require time to the direct parent
          const prevRequireTime = timings.totalRequireTime.get(parent) ?? 0;
          timings.totalRequireTime.set(parent, prevRequireTime + requireTime);
        }

        // Increment total require count for all parents on the stack (direct + indirect)
        stack.forEach((ancestor) => {
          const prevTotalRequires = timings.totalRequires.get(ancestor) ?? 0;
          timings.totalRequires.set(ancestor, prevTotalRequires + 1);
        });

        // Capture the require stack for this file (max 5 ancestors: parent -> grandparent -> ...)
        // Stack is currently [ancestor1, ancestor2, ..., filename] after we pushed filename
        // We want to save the ancestors in order: direct parent -> grandparent -> great-grandparent
        const requireStack = [...stack].slice(0, -1).reverse().slice(0, 5);
        if (requireStack.length > 0) {
          timings.lastRequireStack.set(filename, requireStack);
        }
      }
    },
    wrapRequire: wrapRequireImpl,
  };
}

export const jestProfilerRuntime =
  g[PROFILER_RUNTIME_KEY] || (g[PROFILER_RUNTIME_KEY] = createProfilerRuntime());
