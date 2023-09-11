/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ThemeServiceStart } from '@kbn/react-kibana-context-common';
import React from 'react';

import { KibanaThemeProvider } from './theme_provider';

/**
 * A React HOC that wraps a component with the `KibanaThemeProvider`.
 * @param node The node to wrap.
 * @param theme The `ThemeServiceStart` API.
 */
export const wrapWithTheme = (node: React.ReactNode, theme: ThemeServiceStart) => (
  <KibanaThemeProvider {...{ theme }}>{node}</KibanaThemeProvider>
);
