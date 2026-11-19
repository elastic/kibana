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

interface ChromeColorModes {
  /** The color mode of the application (what popovers should revert to). */
  appColorMode: EuiThemeColorModeStandard;
  /** The color mode the chrome contents (header buttons, nav) render in. */
  chromeColorMode: 'light' | 'dark';
}

const ChromeColorModesContext = createContext<ChromeColorModes | undefined>(undefined);

/**
 * Renders the chrome contents in `colorMode` so text and icons stay readable on a custom chrome
 * background. Popovers opened from inside revert to the application's color mode through
 * {@link ClassicHeaderPopoverColorMode}. It's a no-op when `colorMode` is not set or already
 * matches the application's color mode.
 */
export const ChromeColorModeProvider = ({
  colorMode,
  children,
}: {
  colorMode?: 'light' | 'dark';
  children: ReactNode;
}) => {
  const { colorMode: appColorMode } = useEuiTheme();

  if (!colorMode || colorMode.toUpperCase() === appColorMode) {
    return <>{children}</>;
  }

  return (
    <ChromeColorModesContext.Provider value={{ appColorMode, chromeColorMode: colorMode }}>
      <EuiThemeProvider colorMode={colorMode}>{children}</EuiThemeProvider>
    </ChromeColorModesContext.Provider>
  );
};

export const ClassicHeaderDarkColorMode = ({ children }: { children: ReactNode }) => {
  const { colorMode } = useEuiTheme();

  return (
    <ChromeColorModesContext.Provider value={{ appColorMode: colorMode, chromeColorMode: 'dark' }}>
      <EuiThemeProvider colorMode="dark">{children}</EuiThemeProvider>
    </ChromeColorModesContext.Provider>
  );
};

export const ClassicHeaderPopoverColorMode = ({ children }: { children: ReactNode }) => {
  const modes = useContext(ChromeColorModesContext);
  if (!modes) {
    return children;
  }
  return <EuiThemeProvider colorMode={modes.appColorMode}>{children}</EuiThemeProvider>;
};

export const ClassicHeaderButtonColorMode = ({ children }: { children: ReactNode }) => {
  const modes = useContext(ChromeColorModesContext);
  if (!modes) {
    return children;
  }
  return <EuiThemeProvider colorMode={modes.chromeColorMode}>{children}</EuiThemeProvider>;
};
