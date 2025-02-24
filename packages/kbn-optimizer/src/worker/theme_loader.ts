/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import webpack from 'webpack';
import {
  FALLBACK_THEME_TAG,
  parseThemeTags,
  hasNonDefaultThemeTags,
} from '@kbn/core-ui-settings-common';

const getStringifiedRequest = (loaderContext: webpack.LoaderContext<any>, request: string) => {
  return JSON.stringify(
    loaderContext.utils.contextify(loaderContext.context || loaderContext.rootContext, request)
  );
};

// eslint-disable-next-line import/no-default-export
export default function (this: webpack.LoaderContext<any>) {
  this.cacheable(true);

  const options = this.getOptions();
  const bundleId = options.bundleId as string;
  const themeTags = parseThemeTags(options.themeTags);
  const isFallbackNeeded = hasNonDefaultThemeTags(themeTags);

  /**
   * The following piece of code generates a `switch` statement that gets injected into the output
   * bundle for all `.scss` file imports. The generated `switch` contains:
   * - a `case` clause for each of the bundled theme tags,
   * - an optional `default` clause for the theme fallback logic, included when some of the default
   *   Kibana theme tags are omitted and the fallback logic might be needed. The fallback logic
   *   should never have to run and is added as an extra precaution layer.
   */

  let defaultClause = '';
  if (isFallbackNeeded) {
    defaultClause = `
    default:
      console.error(new Error("SASS files in [${bundleId}] were not built for theme [" + window.__kbnThemeTag__ + "]. Styles were compiled using the [${FALLBACK_THEME_TAG}] theme instead to keep Kibana somewhat usable. Please adjust the advanced settings to make use of [${themeTags}] or make sure the KBN_OPTIMIZER_THEMES environment variable includes [" + window.__kbnThemeTag__ + "] in a comma-separated list of themes you want to compile. You can also set it to \'*\' to build all themes."));
      return require(${getStringifiedRequest(
        this,
        `${this.resourcePath}?${FALLBACK_THEME_TAG}`
      )});`;
  }

  return `
switch (window.__kbnThemeTag__) {
${themeTags
  .map(
    (tag) => `
  case '${tag}':
    return require(${getStringifiedRequest(this, `${this.resourcePath}?${tag}`)});`
  )
  .join('\n')}
  ${defaultClause}
}`;
}
