/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';
import type { I18nStart } from '@kbn/core-i18n-browser';
import { composeProviders, KibanaThemeProvider } from '@kbn/react-kibana-context';
import { ThemeServiceStart } from '@kbn/core-theme-browser/src/types';

interface CoreContextProviderProps {
  i18n: I18nStart;
  theme: ThemeServiceStart;
  globalStyles?: boolean;
}

/**
 * Utility component exposing all the context providers required by core when integrating with React.
 **/
export const CoreContextProvider: FC<CoreContextProviderProps> = ({
  i18n,
  children,
  theme,
  globalStyles = false,
}) => {
  const Provider = composeProviders([i18n.Context, KibanaThemeProvider]);

  return (
    <Provider theme$={theme.theme$} {...{ globalStyles }}>
      {children}
    </Provider>
  );
};
