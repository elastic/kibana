/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { createContext, useContext, FC, PropsWithChildren, useMemo } from 'react';
import {
  KibanaSharedUXRouterProviderDeps,
  SharedUXRouterServices,
} from '@kbn/shared-ux-router-types';

const Context = createContext<SharedUXRouterServices | null>(null);

export const SharedUXRouterDepsProvider: FC<PropsWithChildren<SharedUXRouterServices>> = ({
  children,
  services,
}) => <Context.Provider value={{ services }}>{children}</Context.Provider>;

export const RouterProvider: FC<PropsWithChildren<KibanaSharedUXRouterProviderDeps>> = ({
  children,
  context$,
  get,
  set,
  clear,
}) => {
  const parentContext = useContext(Context);
  const value: SharedUXRouterServices = useMemo(() => {
    if (parentContext) {
      return parentContext;
    }

    return {
      services: { get, set, clear, context$ },
    };
  }, [clear, context$, get, parentContext, set]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
};

/** Utility that provides context
 * @internal
 */
export function useKibanaSharedUX(): SharedUXRouterServices {
  const context = useContext(Context);
  if (!context) {
    throw new Error(
      'Kibana Shared UX Context is missing. Ensure your component or React root is wrapped with Kibana Shared UX Context.'
    );
  }
  return context;
}
