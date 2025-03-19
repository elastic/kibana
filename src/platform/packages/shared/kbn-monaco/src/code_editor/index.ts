/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { CODE_EDITOR_DEFAULT_THEME_ID, CODE_EDITOR_TRANSPARENT_THEME_ID } from './constants';

import { buildTheme, buildTransparentTheme } from './theme';

// export these so that they are consumed by the actual code editor implementation
export const defaultThemesResolvers = {
  [CODE_EDITOR_DEFAULT_THEME_ID]: buildTheme,
  [CODE_EDITOR_TRANSPARENT_THEME_ID]: buildTransparentTheme,
};

export { CODE_EDITOR_DEFAULT_THEME_ID, CODE_EDITOR_TRANSPARENT_THEME_ID };
