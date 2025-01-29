/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Observable } from 'rxjs';
import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';

// Should be exported from elastic/apm-rum
export type LabelValue = string | number | boolean;

export interface Labels {
  [key: string]: LabelValue;
}

/**
 * Kibana execution context.
 * Used to provide execution context to Elasticsearch, reporting, performance monitoring, etc.
 * @public
 **/
export interface ExecutionContextSetup {
  /**
   * The current context observable
   **/
  context$: Observable<KibanaExecutionContext>;
  /**
   * Set the current top level context
   **/
  set(c$: KibanaExecutionContext): void;
  /**
   * Get the current top level context
   **/
  get(): KibanaExecutionContext;
  /**
   * clears the context
   **/
  clear(): void;
  /**
   * returns apm labels
   **/
  getAsLabels(): Labels;
  /**
   * merges the current top level context with the specific event context
   **/
  withGlobalContext(context?: KibanaExecutionContext): KibanaExecutionContext;
}

/**
 * See {@link ExecutionContextSetup}.
 * @public
 */
export type ExecutionContextStart = ExecutionContextSetup;
