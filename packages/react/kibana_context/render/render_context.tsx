/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';

import { EuiErrorBoundary } from '@elastic/eui';
import type { I18nStart } from '@kbn/core-i18n-browser';
import {
  KibanaThemeProvider,
  type KibanaThemeProviderProps,
} from '@kbn/react-kibana-context-theme';

/** Props for the KibanaContextProvider */
export interface KibanaRenderContextProviderProps extends KibanaThemeProviderProps {
  i18n: I18nStart;
}

/**
 * The `KibanaRenderContextProvider` provides the necessary context for an out-of-current
 * React render, such as using `ReactDOM.render()`.
 */
export const KibanaRenderContextProvider: FC<KibanaRenderContextProviderProps> = ({
  children,
  i18n,
  ...props
}) => {
  return (
    <i18n.Context>
      <KibanaThemeProvider {...props}>
        <EuiErrorBoundary>{children}</EuiErrorBoundary>
      </KibanaThemeProvider>
    </i18n.Context>
  );
};
