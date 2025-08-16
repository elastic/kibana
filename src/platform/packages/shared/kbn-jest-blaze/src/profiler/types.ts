/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface JestProfilerRuntime {
  process: <T>(filename: string, cb: () => T) => T;
  require: <T>(filename: string, cb: () => T) => T;
  // Execute module code with a wrapped require; caller preserves top-level this
  execute: <T>(
    filename: string,
    origRequire: NodeJS.Require,
    cb: (require: NodeJS.Require) => T
  ) => T;
  get timings(): {
    totalProcessTime: Map<string, number>;
    totalExecuteTime: Map<string, number>;
    totalExecuteCount: Map<string, number>;
    totalDirectRequires: Map<string, number>;
    totalRequires: Map<string, number>;
    totalRequireTime: Map<string, number>;
    lastRequireStack: Map<string, string[]>;
  };
  wrapRequire: (origRequire: NodeJS.Require, parentFilename: string) => NodeJS.Require;
}

declare global {
  // Persisted on globalThis to accumulate data across requires in a single Jest process
  // eslint-disable-next-line no-var
  var __JEST_PROFILER_RUNTIME: JestProfilerRuntime | undefined;
}
