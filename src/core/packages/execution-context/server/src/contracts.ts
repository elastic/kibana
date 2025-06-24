/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type apm from 'elastic-apm-node';
import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';

/**
 * @public
 */
export interface ExecutionContextSetup {
  /**
   * Keeps track of execution context while the passed function is executed.
   * Data are carried over all async operations spawned by the passed function.
   * The nested calls stack the registered context on top of each other.
   **/
  withContext<R>(context: KibanaExecutionContext | undefined, fn: (...args: any[]) => R): R;

  getAsLabels(): apm.Labels;
}

/**
 * @public
 */
export type ExecutionContextStart = ExecutionContextSetup;
