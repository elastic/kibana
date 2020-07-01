/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { stringifyRequest, getOptions } from 'loader-utils';
import webpack from 'webpack';
import { parseThemeTags, ALL_THEMES } from '../common';

// eslint-disable-next-line import/no-default-export
export default function (this: webpack.loader.LoaderContext) {
  this.cacheable(true);

  const themeTags = parseThemeTags(getOptions(this).themeTags);

  const cases = ALL_THEMES.map((tag) => {
    if (themeTags.includes(tag)) {
      return `
  case '${tag}':
    return require(${stringifyRequest(this, `${this.resourcePath}?${tag}`)});`;
    }

    const fallback = themeTags[0];
    const message = `Styles for [${tag}] were not built by the current @kbn/optimizer config. Falling back to [${fallback}] theme to make Kibana usable. Please adjust the advanced settings to make use of [${themeTags}] or make sure the KBN_OPTIMIZER_THEMES environment variable includes [${tag}] in a comma separated list of themes you want to use. You can also set it to "*" to build all themes.`;
    return `
  case '${tag}':
    console.error(new Error(${JSON.stringify(message)}));
    return require(${stringifyRequest(this, `${this.resourcePath}?${fallback}`)})`;
  }).join('\n');

  return `
switch (window.__kbnThemeTag__) {${cases}
}`;
}
