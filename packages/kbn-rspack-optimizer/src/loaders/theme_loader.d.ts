/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LoaderContext } from '@rspack/core';
interface ThemeLoaderOptions {
  bundleId: string;
  themeTags: string[];
}
/**
 * Theme loader for RSPack.
 *
 * This loader generates a `switch` statement that gets injected into the output
 * bundle for all `.scss` file imports. The generated `switch` contains:
 * - A `case` clause for each of the bundled theme tags
 * - An optional `default` clause for theme fallback logic
 *
 * At runtime, `window.__kbnThemeTag__` determines which compiled stylesheet to use.
 */
export default function themeLoader(this: LoaderContext<ThemeLoaderOptions>): string;
export {};
