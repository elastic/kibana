/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useContext, useMemo } from 'react';

import { KibanaErrorBoundaryProviderDeps, KibanaErrorBoundaryServices } from '../../types';
import { KibanaErrorService } from './error_service';

const Context = React.createContext<KibanaErrorBoundaryServices | null>(null);

/**
 * A Context Provider for Jest and Storybooks
 * @internal
 */
export const KibanaErrorBoundaryDepsProvider: FC<KibanaErrorBoundaryServices> = ({
  children,
  onClickRefresh,
  errorService,
}) => <Context.Provider value={{ onClickRefresh, errorService }}>{children}</Context.Provider>;

/**
 * Provider that uses dependencies to give context to the KibanaErrorBoundary component
 * This provider is aware if services were already created from a higher level of the component tree
 * @public
 */
export const KibanaErrorBoundaryProvider: FC<KibanaErrorBoundaryProviderDeps> = ({
  children,
  analytics,
}) => {
  const parentContext = useContext(Context);
  const value: KibanaErrorBoundaryServices = useMemo(() => {
    // FIXME: analytics dep is optional - know when not to overwrite
    if (parentContext) {
      return parentContext;
    }

    return {
      onClickRefresh: () => window.location.reload(),
      errorService: new KibanaErrorService({ analytics }),
    };
  }, [parentContext, analytics]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
};

/**
 * Utility that provides context
 * @internal
 */
export function useErrorBoundary(): KibanaErrorBoundaryServices {
  const context = useContext(Context);
  if (!context) {
    throw new Error(
      'Kibana Error Boundary Context is missing. Ensure your component or React root is wrapped with Kibana Error Boundary Context.'
    );
  }

  return context;
}
