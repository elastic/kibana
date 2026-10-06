/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This should only be used to pass the darkMode to a theme provider which is outside
 * of the global theme provider scope. For example when used with `EuiThemeProvider`.
 *
 * @deprecated
 */
export declare const useDarkMode: (defaultValue?: boolean) => boolean;
