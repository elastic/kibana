/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { stringifyRequest, getOptions } from 'loader-utils';
import webpack from 'webpack';
import { parseThemeTags, ALL_THEMES, ThemeTag } from '../common';

const getVersion = (tag: ThemeTag) => 8;
const getIsDark = (tag: ThemeTag) => tag.includes('dark');
const compare = (a: ThemeTag, b: ThemeTag) =>
  (getVersion(a) === getVersion(b) ? 1 : 0) + (getIsDark(a) === getIsDark(b) ? 1 : 0);

// eslint-disable-next-line import/no-default-export
export default function (this: webpack.loader.LoaderContext) {
  this.cacheable(true);

  const options = getOptions(this);
  const bundleId: string = options.bundleId!;
  const themeTags = parseThemeTags(options.themeTags);

  const cases = ALL_THEMES.map((tag) => {
    if (themeTags.includes(tag)) {
      return `
  case '${tag}':
    return require(${stringifyRequest(this, `${this.resourcePath}?${tag}`)});`;
    }

    const fallback = themeTags
      .slice()
      .sort((a, b) => compare(b, tag) - compare(a, tag))
      .shift()!;

    const message = `SASS files in [${bundleId}] were not built for theme [${tag}]. Styles were compiled using the [${fallback}] theme instead to keep Kibana somewhat usable. Please adjust the advanced settings to make use of [${themeTags}] or make sure the KBN_OPTIMIZER_THEMES environment variable includes [${tag}] in a comma separated list of themes you want to compile. You can also set it to "*" to build all themes.`;
    return `
  case '${tag}':
    console.error(new Error(${JSON.stringify(message)}));
    return require(${stringifyRequest(this, `${this.resourcePath}?${fallback}`)})`;
  }).join('\n');

  return `
switch (window.__kbnThemeTag__) {${cases}
}`;
}
