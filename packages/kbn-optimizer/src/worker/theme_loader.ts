/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { stringifyRequest, getOptions } from 'loader-utils';
import webpack from 'webpack';
import { FALLBACK_THEME_TAG, parseThemeTags } from '@kbn/core-ui-settings-common';

// eslint-disable-next-line import/no-default-export
export default function (this: webpack.loader.LoaderContext) {
  this.cacheable(true);

  const options = getOptions(this);
  const bundleId = options.bundleId as string;
  const themeTags = parseThemeTags(options.themeTags);

  return `
switch (window.__kbnThemeTag__) {
${themeTags.map(
  (tag) => `
  case '${tag}':
    return require(${stringifyRequest(this, `${this.resourcePath}?${tag}`)});`
).join('\n')}
  default:
    console.error(new Error("SASS files in [${bundleId}] were not built for theme [" + window.__kbnThemeTag__ + "]. Styles were compiled using the [${FALLBACK_THEME_TAG}] theme instead to keep Kibana somewhat usable. Please adjust the advanced settings to make use of [${themeTags}] or make sure the KBN_OPTIMIZER_THEMES environment variable includes [" + window.__kbnThemeTag__ + "] in a comma-separated list of themes you want to compile. You can also set it to '*' to build all themes."));
    return require(${stringifyRequest(this, `${this.resourcePath}?${FALLBACK_THEME_TAG}`)});
}`;
}
