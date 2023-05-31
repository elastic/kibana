/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KibanaThemeProvider } from '@kbn/react-kibana-context';

/**
 * Wrapper around `EuiProvider` converting (and exposing) core's theme to EUI theme.
 * @internal Only meant to be used within core for internal usages of EUI/React
 * @deprecated use `KibanaThemeProvider` from `@kbn/react-kibana-context
 */
export const CoreThemeProvider = KibanaThemeProvider;
CoreThemeProvider.displayName = 'CoreThemeProvider';
