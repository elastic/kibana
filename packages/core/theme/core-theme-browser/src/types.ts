/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable } from 'rxjs';

/**
 * Contains all the required information to apply Kibana's theme at the various levels it can be used.
 *
 * @public
 */
export interface CoreTheme {
  /** is dark mode enabled or not */
  readonly darkMode: boolean;
}

/**
 * @public
 */
export interface ThemeServiceSetup {
  theme$: Observable<CoreTheme>;
}

/**
 * @public
 */
export interface ThemeServiceStart {
  theme$: Observable<CoreTheme>;
}
