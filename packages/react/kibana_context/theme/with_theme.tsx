/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { Observable } from 'rxjs';

import { KibanaThemeProvider } from './theme';
import type { Theme } from '../types';

export const wrapWithTheme = (node: React.ReactNode, theme$: Observable<Theme>) => (
  <KibanaThemeProvider theme$={theme$}>{node}</KibanaThemeProvider>
);
