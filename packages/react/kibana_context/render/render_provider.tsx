/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC, PropsWithChildren } from 'react';

import {
  KibanaRootContextProvider,
  type KibanaRootContextProviderProps,
} from '@kbn/react-kibana-context-root';
import { KibanaErrorBoundary, KibanaErrorBoundaryProvider } from '@kbn/shared-ux-error-boundary';

/** Props for the KibanaContextProvider */
export type KibanaRenderContextProviderProps = Omit<KibanaRootContextProviderProps, 'globalStyles'>;

/**
 * The `KibanaRenderContextProvider` provides the necessary context for an out-of-current
 * React render, such as using `ReactDOM.render()`.
 */
export const KibanaRenderContextProvider: FC<
  PropsWithChildren<KibanaRenderContextProviderProps>
> = ({ children, ...props }) => {
  return (
    <KibanaRootContextProvider globalStyles={false} {...props}>
      <KibanaErrorBoundaryProvider analytics={props.analytics}>
        <KibanaErrorBoundary>{children}</KibanaErrorBoundary>
      </KibanaErrorBoundaryProvider>
    </KibanaRootContextProvider>
  );
};
