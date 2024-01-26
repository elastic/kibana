/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { KibanaThemeProvider, type KibanaThemeProviderProps } from './theme_provider';
export { wrapWithTheme } from './with_theme';

// Re-exporting from @kbn/react-kibana-context-common for convenience to consumers.
export { defaultTheme, type KibanaTheme } from '@kbn/react-kibana-context-common';
