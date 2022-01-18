/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { Observable } from 'rxjs';
import { EuiThemeProvider } from '@elastic/eui';
import type { CoreTheme } from '../../../../core/public';
import { getColorMode } from './utils';

interface KibanaThemeProviderProps {
  theme$: Observable<CoreTheme>;
}

const defaultTheme: CoreTheme = {
  darkMode: false,
};

/* IMPORTANT: This code has been copied to the `interactive_setup` plugin, any changes here should be applied there too.
That copy and this comment can be removed once https://github.com/elastic/kibana/issues/119204 is implemented.*/
// IMPORTANT: This code has been copied to the `kibana_utils` plugin, to avoid cyclical dependency, any changes here should be applied there too.

export const KibanaThemeProvider: FC<KibanaThemeProviderProps> = ({ theme$, children }) => {
  const theme = useObservable(theme$, defaultTheme);
  const colorMode = useMemo(() => getColorMode(theme), [theme]);
  return <EuiThemeProvider colorMode={colorMode}>{children}</EuiThemeProvider>;
};
