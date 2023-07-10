/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';
import { I18nProvider } from '@kbn/i18n-react';

import { KibanaThemeProvider, type KibanaThemeProviderProps } from '../theme';

/** Props for the KibanaContextProvider */
export type KibanaContextProviderProps = KibanaThemeProviderProps;

/**
 * The `KibanaContextProvider` provides the necessary context for Kibana's React components, including
 * the theme and i18n context.  In almost all cases, this provider should appear early in any plugin's
 * React trees.
 */
export const KibanaContextProvider: FC<KibanaContextProviderProps> = ({ children, ...props }) => {
  return (
    <I18nProvider>
      <KibanaThemeProvider {...props}>{children}</KibanaThemeProvider>
    </I18nProvider>
  );
};
