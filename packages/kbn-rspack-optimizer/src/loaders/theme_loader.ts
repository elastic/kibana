/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LoaderContext } from '@rspack/core';
import {
  FALLBACK_THEME_TAG,
  parseThemeTags,
  hasNonDefaultThemeTags,
} from '@kbn/core-ui-settings-common';

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
// eslint-disable-next-line import/no-default-export
export default function themeLoader(this: LoaderContext<ThemeLoaderOptions>) {
  this.cacheable(true);

  const options = this.getOptions();
  const bundleId = options.bundleId || 'kibana';
  const themeTags = parseThemeTags(options.themeTags);
  const isFallbackNeeded = hasNonDefaultThemeTags(themeTags);

  // Generate stringified request for each theme
  const getStringifiedRequest = (theme: string) => {
    // Use resourceQuery to differentiate theme-specific imports
    return JSON.stringify(`${this.resourcePath}?${theme}`);
  };

  // Generate default clause for fallback
  let defaultClause = '';
  if (isFallbackNeeded) {
    defaultClause = `
    default:
      console.error(new Error("SASS files in [${bundleId}] were not built for theme [" + window.__kbnThemeTag__ + "]. Styles were compiled using the [${FALLBACK_THEME_TAG}] theme instead to keep Kibana somewhat usable. Please adjust the advanced settings to make use of [${themeTags}] or make sure the KBN_OPTIMIZER_THEMES environment variable includes [" + window.__kbnThemeTag__ + "] in a comma-separated list of themes you want to compile. You can also set it to '*' to build all themes."));
      return require(${getStringifiedRequest(FALLBACK_THEME_TAG)});`;
  }

  // Generate switch statement
  return `
switch (window.__kbnThemeTag__) {
${themeTags
  .map(
    (tag) => `
  case '${tag}':
    return require(${getStringifiedRequest(tag)});`
  )
  .join('\n')}
  ${defaultClause}
}`;
}
