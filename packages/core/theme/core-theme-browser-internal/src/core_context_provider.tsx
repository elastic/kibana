/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';
import type { ThemeServiceStart } from '@kbn/core-theme-browser';
import type { I18nStart } from '@kbn/core-i18n-browser';
import { CoreThemeProvider } from './core_theme_provider';

interface CoreContextProviderProps {
  theme: ThemeServiceStart;
  i18n: I18nStart;
  globalStyles?: boolean;
}

/**
 * utility component exposing all the context providers required by core when integrating with react
 **/
export const CoreContextProvider: FC<CoreContextProviderProps> = ({
  i18n,
  theme,
  children,
  globalStyles = false,
}) => {
  // `globalStyles` and `utilityClasses` default values are inverted from that of `EuiProvider`.
  // Default to `false` (does not add EUI global styles) because more instances use that value.
  // A value of `true` (does add EUI global styles) will have `EuiProvider` use its default value.
  const includeGlobalStyles = globalStyles === false ? false : undefined;
  return (
    <i18n.Context>
      <CoreThemeProvider theme$={theme.theme$} globalStyles={includeGlobalStyles}>
        {children}
      </CoreThemeProvider>
    </i18n.Context>
  );
};
