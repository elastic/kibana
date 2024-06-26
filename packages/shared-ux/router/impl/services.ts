/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable } from 'rxjs';
import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import { createContext, useContext } from 'react';

export interface SharedUXExecutionContextKibanaDependencies {
  core: {
    http: {
      executionContext: {
        context$: Observable<KibanaExecutionContext>;
        set(c$: KibanaExecutionContext): void;
        get(): KibanaExecutionContext;
        clear(): void;
      };
    };
  };
}

export declare type SharedUXExecutionContextStart = SharedUXExecutionContextKibanaDependencies;

export type KibanaServices = Partial<SharedUXExecutionContextKibanaDependencies>;

export interface SharedUXRouterContextValue<Services extends KibanaServices> {
  readonly services: Services;
}

const defaultContextValue = { services: {} };

export const sharedUXContext =
  createContext<SharedUXRouterContextValue<KibanaServices>>(defaultContextValue);

export const useKibanaSharedUX = <Extra extends object = {}>(): SharedUXRouterContextValue<
  KibanaServices & Extra
> =>
  useContext(
    sharedUXContext as unknown as React.Context<SharedUXRouterContextValue<KibanaServices & Extra>>
  );
