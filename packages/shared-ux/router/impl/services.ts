/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Observable } from 'rxjs';
import { createContext, useContext } from 'react';
import { SharedUXExecutionContext } from './types';

/**
 * @public Execution context start and setup types are the same
 */
export declare type SharedUXExecutionContextStart = SharedUXExecutionContextSetup;

/**
 * Reduced the interface from ExecutionContextSetup from '@kbn/core-execution-context-browser' to only include properties needed for the Route
 */
export interface SharedUXExecutionContextSetup {
  /**
   * The current context observable
   **/
  context$: Observable<SharedUXExecutionContext>;
  /**
   * Set the current top level context
   **/
  set(c$: SharedUXExecutionContext): void;
  /**
   * Get the current top level context
   **/
  get(): SharedUXExecutionContext;
  /**
   * clears the context
   **/
  clear(): void;
}

/**
 * Taken from Core services exposed to the `Plugin` start lifecycle
 *
 * @public
 *
 * @internalRemarks We document the properties with
 * \@link tags to improve
 * navigation in the generated docs until there's a fix for
 * https://github.com/Microsoft/web-build-tools/issues/1237
 */
export interface SharedUXExecutionContextSetup {
  /** {@link SharedUXExecutionContextSetup} */
  executionContext: SharedUXExecutionContextStart;
}

export type KibanaServices = Partial<SharedUXExecutionContextSetup>;

export interface SharedUXRouterContextValue<Services extends KibanaServices> {
  readonly services: Services;
}

const defaultContextValue = {
  services: {},
};

export const sharedUXContext =
  createContext<SharedUXRouterContextValue<KibanaServices>>(defaultContextValue);

export const useKibanaSharedUX = <Extra extends object = {}>(): SharedUXRouterContextValue<
  KibanaServices & Extra
> =>
  useContext(
    sharedUXContext as unknown as React.Context<SharedUXRouterContextValue<KibanaServices & Extra>>
  );
