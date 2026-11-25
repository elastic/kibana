/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import React, { createContext, useContext } from 'react';
import { EuiThemeProvider, useEuiTheme, type EuiThemeColorModeStandard } from '@elastic/eui';

const AppColorModeContext = createContext<EuiThemeColorModeStandard | undefined>(undefined);

export const ClassicHeaderDarkColorMode = ({ children }: { children: ReactNode }) => {
  const { colorMode } = useEuiTheme();

  return (
    <AppColorModeContext.Provider value={colorMode}>
      <EuiThemeProvider colorMode="dark">{children}</EuiThemeProvider>
    </AppColorModeContext.Provider>
  );
};

export const ClassicHeaderPopoverColorMode = ({ children }: { children: ReactNode }) => {
  const colorMode = useContext(AppColorModeContext);
  if (!colorMode) {
    return children;
  }
  return <EuiThemeProvider colorMode={colorMode}>{children}</EuiThemeProvider>;
};

export const ClassicHeaderButtonColorMode = ({ children }: { children: ReactNode }) => {
  const invert = useContext(AppColorModeContext);
  if (!invert) {
    return children;
  }
  return <EuiThemeProvider colorMode="dark">{children}</EuiThemeProvider>;
};
