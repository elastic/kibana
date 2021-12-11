/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';
import { CoreThemeProvider } from '../theme/core_theme_provider';
import type { ThemeServiceStart } from '../theme';
import type { I18nStart } from '../i18n';

interface CoreContextProviderProps {
  theme: ThemeServiceStart;
  i18n: I18nStart;
}

/**
 * utility component exposing all the context providers required by core when integrating with react
 **/
export const CoreContextProvider: FC<CoreContextProviderProps> = ({ i18n, theme, children }) => {
  return (
    <i18n.Context>
      <CoreThemeProvider theme$={theme.theme$}>{children}</CoreThemeProvider>
    </i18n.Context>
  );
};
