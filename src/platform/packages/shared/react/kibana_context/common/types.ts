/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Observable } from 'rxjs';

// To avoid a circular dependency with the deprecation of `CoreThemeProvider`,
// we need to define the theme type here.
//
// TODO: clintandrewhall - remove this file once `CoreThemeProvider` is removed

/**
 * The representation of the Kibana theme, (not to be confused with the EUI theme).
 */
export interface KibanaTheme {
  /** is dark mode enabled or not */
  readonly darkMode: boolean;
  /**
   * Name of the active theme
   */
  readonly name: string;
}

// To avoid a circular dependency with the deprecation of `CoreThemeProvider`,
// we need to define the theme type here.
//
// TODO: clintandrewhall - remove this file once `CoreThemeProvider` is removed
/**
 * The `ThemeService` start contract, provided to plugins during the `start` lifecycle.
 */
export interface ThemeServiceStart {
  theme$: Observable<KibanaTheme>;
}
