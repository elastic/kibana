/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ThemeServiceSetup } from '@kbn/core-theme-browser';
import { createToken } from '@kbn/core-di';
import type { ServiceToken } from '@kbn/core-di';

/**
 * The theme API.
 * @see {@link ThemeServiceSetup}
 * @public
 */
export type ITheme = ThemeServiceSetup;

/**
 * The service exposing the currently active theme.
 * @see {@link ITheme}
 * @public
 */
export const Theme: ServiceToken<ITheme> = createToken('Theme');
