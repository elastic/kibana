/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useMemo } from 'react';
import { Observable } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import { EuiThemeProvider } from '@elastic/eui';
import { EuiThemeColorMode, COLOR_MODES_STANDARD } from '@elastic/eui/src/services/theme/types';
import type { CoreTheme } from '../../../../core/public';

export const wrapWithTheme = (
  node: React.ReactNode,
  theme$: Observable<CoreTheme>
): React.ReactElement => {
  return <KibanaThemeWrapper theme$={theme$}>{node}</KibanaThemeWrapper>;
};

const defaultTheme: CoreTheme = {
  darkMode: false,
};

interface KibanaThemeWrapperProps {
  theme$: Observable<CoreTheme>;
}

const KibanaThemeWrapper: FC<KibanaThemeWrapperProps> = ({ theme$, children }) => {
  const theme = useObservable(theme$, defaultTheme);
  const colorMode = useMemo(() => getColorMode(theme), [theme]);
  return <EuiThemeProvider colorMode={colorMode}>{children}</EuiThemeProvider>;
};

const getColorMode = (theme: CoreTheme): EuiThemeColorMode => {
  return theme.darkMode ? COLOR_MODES_STANDARD.dark : COLOR_MODES_STANDARD.light;
};
