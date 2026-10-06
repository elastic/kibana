/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Register a cleanup callback. The callback is wrapped with lodash.once and a
 * Promise.race that respects a timeout and the abort signal from
 * `processExitController`.
 */
export declare const cleanupBeforeExit: (
  callback: () => void | Promise<void>,
  options?: import('./types').CleanupBeforeExitOptions
) => () => void;
