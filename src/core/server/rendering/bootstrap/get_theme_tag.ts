/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ThemeVersion } from '@kbn/ui-shared-deps-npm';

/**
 * Computes the themeTag that will be used on the client-side as `__kbnThemeTag__`
 * @see `packages/kbn-ui-shared-deps-src/theme.ts`
 */
export const getThemeTag = ({
  themeVersion,
  darkMode,
}: {
  themeVersion: ThemeVersion;
  darkMode: boolean;
}) => {
  return `${themeVersion}${darkMode ? 'dark' : 'light'}`;
};
