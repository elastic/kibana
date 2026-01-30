/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import type { RuleSetRule } from '@rspack/core';
import type { ThemeTag } from '../types';

/**
 * Create SCSS rules with theme support
 * Each SCSS file is compiled once per theme tag with theme-specific globals
 */
export function createThemeRules(
  themeTags: ThemeTag[],
  repoRoot: string,
  dist: boolean
): RuleSetRule[] {
  const rules: RuleSetRule[] = [];

  // Create a rule for each theme tag with resource query
  for (const theme of themeTags) {
    rules.push({
      test: /\.scss$/,
      resourceQuery: new RegExp(`\\?${theme}`),
      exclude: /node_modules/,
      use: [
        {
          loader: require.resolve('sass-loader'),
          options: {
            additionalData: (content: string) => {
              const globalsPath = Path.resolve(
                repoRoot,
                `src/core/public/styles/core_app/_globals_${theme}.scss`
              );
              return `@import "${globalsPath}";\n${content}`;
            },
            sassOptions: {
              outputStyle: dist ? 'compressed' : 'expanded',
              includePaths: [Path.resolve(repoRoot, 'node_modules')],
              sourceMap: !dist,
              quietDeps: true,
              silenceDeprecations: [
                'color-functions',
                'import',
                'global-builtin',
                'legacy-js-api',
              ],
            },
          },
        },
      ],
      type: 'css',
    });
  }

  // Default rule for SCSS without resource query - generates theme switcher
  rules.push({
    test: /\.scss$/,
    exclude: /node_modules/,
    resourceQuery: { not: themeTags.map((t) => new RegExp(`\\?${t}`)) },
    use: [
      {
        loader: require.resolve('../loaders/theme_loader'),
        options: {
          themeTags,
        },
      },
    ],
  });

  return rules;
}
