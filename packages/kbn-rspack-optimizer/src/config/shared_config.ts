/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import type { RuleSetRule, Configuration } from '@rspack/core';
import type { ThemeTag } from '../types';

/**
 * Shared resolve configuration for all RSPack builds.
 * Used by both main Kibana build and external plugins.
 */
export function getSharedResolveConfig(repoRoot: string): Configuration['resolve'] {
  return {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.peggy', '.scss', '.css'],
    mainFields: ['browser', 'module', 'main'],
    conditionNames: ['browser', 'module', 'import', 'require', 'default'],
    alias: {
      '@elastic/eui$': '@elastic/eui/optimize/es',
    },
    tsConfig: Path.resolve(repoRoot, 'tsconfig.base.json'),
  };
}

/**
 * Shared resolve.fallback for Node.js built-ins.
 * These modules don't exist in browser and should be empty/false.
 */
export function getSharedResolveFallback(): Record<string, false> {
  return {
    // Core Node.js modules that should be empty in browser
    child_process: false,
    net: false,
    tls: false,
    dns: false,
    'node:child_process': false,
    'node:net': false,
    'node:tls': false,
    'node:dns': false,
    // Server-only packages
    xml2js: false,
    xmlbuilder: false,
    sax: false,
  };
}

/**
 * Get the Babel loader configuration.
 * Shared between main build and external plugins.
 */
export function getBabelLoaderRule(dist: boolean): RuleSetRule {
  return {
    test: /\.[jt]sx?$/,
    exclude: /node_modules/,
    use: {
      loader: require.resolve('babel-loader'),
      options: {
        babelrc: false,
        configFile: false,
        presets: [
          [
            require.resolve('@kbn/babel-preset/webpack_preset'),
            { useTransformRequireDefault: true },
          ],
        ],
        envName: dist ? 'production' : 'development',
      },
    },
  };
}

/**
 * Get CSS loader rule for all CSS files.
 * Uses style-loader + css-loader for maximum compatibility with
 * node_modules packages like @xyflow/react, react-diff-viewer, etc.
 *
 * Note: We explicitly set type: 'javascript/auto' to tell RSPack to use
 * the loader chain instead of trying to use native CSS parsing.
 */
export function getCssLoaderRule(dist: boolean): RuleSetRule {
  return {
    test: /\.css$/,
    type: 'javascript/auto', // Use loader chain, not native CSS parsing
    use: [
      { loader: require.resolve('style-loader') },
      {
        loader: require.resolve('css-loader'),
        options: { sourceMap: !dist },
      },
    ],
  };
}

/**
 * Get the sass-loader chain for a specific theme.
 * Each theme uses different globals (light vs dark colors/shadows).
 */
function getSassLoaderChain(
  repoRoot: string,
  theme: ThemeTag,
  dist: boolean
): RuleSetRule['use'] {
  const nodeModulesPath = Path.resolve(repoRoot, 'node_modules');
  const globalsPath = Path.resolve(
    repoRoot,
    `src/core/public/styles/core_app/_globals_${theme}.scss`
  ).replace(/\\/g, '/');

  return [
    { loader: require.resolve('style-loader') },
    {
      loader: require.resolve('css-loader'),
      options: { sourceMap: !dist },
    },
    {
      loader: require.resolve('sass-loader'),
      options: {
        additionalData: `@import "${globalsPath}";\n`,
        implementation: require('sass-embedded'),
        sassOptions: {
          outputStyle: dist ? 'compressed' : 'expanded',
          includePaths: [
            nodeModulesPath,
            Path.resolve(repoRoot, 'src/core/public/styles'),
            Path.resolve(repoRoot, 'packages'),
          ],
          loadPaths: [
            nodeModulesPath,
            Path.resolve(repoRoot, 'src/core/public/styles'),
          ],
          quietDeps: true,
          silenceDeprecations: ['color-functions', 'import', 'global-builtin', 'legacy-js-api'],
        },
      },
    },
  ];
}

/**
 * Get SCSS loader rule with compile-time theme support.
 *
 * This generates a `oneOf` rule set that:
 * 1. For each theme, matches `*.scss?{theme}` and compiles with that theme's globals
 * 2. For plain `*.scss` imports, uses the theme_loader to generate a runtime switch
 *
 * At runtime, `window.__kbnThemeTag__` determines which compiled stylesheet to use.
 */
export function getScssLoaderRule(
  repoRoot: string,
  dist: boolean,
  themeTags: ThemeTag[] = ['borealislight', 'borealisdark'],
  bundleId: string = 'kibana'
): RuleSetRule {
  return {
    test: /\.scss$/,
    exclude: /node_modules/,
    type: 'javascript/auto',
    oneOf: [
      // For each theme, handle ?{theme} query with theme-specific compilation
      ...themeTags.map((theme) => ({
        resourceQuery: new RegExp(`\\?${theme}$`),
        use: getSassLoaderChain(repoRoot, theme, dist),
      })),
      // For plain .scss imports (no query), use theme_loader to generate switch
      {
        use: [
          {
            loader: require.resolve('../loaders/theme_loader'),
            options: {
              bundleId,
              themeTags,
            },
          },
        ],
      },
    ],
  };
}

/**
 * Get SCSS loader rule for node_modules (no theme switching).
 * Node modules SCSS is compiled with light theme globals only.
 */
export function getNodeModulesScssLoaderRule(repoRoot: string, dist: boolean): RuleSetRule {
  const nodeModulesPath = Path.resolve(repoRoot, 'node_modules');

  return {
    test: /\.scss$/,
    include: /node_modules/,
    type: 'javascript/auto',
    use: [
      { loader: require.resolve('style-loader') },
      {
        loader: require.resolve('css-loader'),
        options: { sourceMap: !dist },
      },
      {
        loader: require.resolve('sass-loader'),
        options: {
          additionalData: `@import "${Path.resolve(
            repoRoot,
            'src/core/public/styles/core_app/_globals_borealislight.scss'
          ).replace(/\\/g, '/')}";\n`,
          implementation: require('sass-embedded'),
          sassOptions: {
            outputStyle: dist ? 'compressed' : 'expanded',
            includePaths: [
              nodeModulesPath,
              Path.resolve(repoRoot, 'src/core/public/styles'),
              Path.resolve(repoRoot, 'packages'),
            ],
            loadPaths: [
              nodeModulesPath,
              Path.resolve(repoRoot, 'src/core/public/styles'),
            ],
            quietDeps: true,
            silenceDeprecations: ['color-functions', 'import', 'global-builtin', 'legacy-js-api'],
          },
        },
      },
    ],
  };
}

/**
 * Get image asset loader rule.
 */
export function getImageLoaderRule(): RuleSetRule {
  return {
    test: /\.(png|jpg|jpeg|gif|svg|ico|webp)$/,
    type: 'asset',
    parser: {
      dataUrlCondition: {
        maxSize: 8 * 1024, // 8kb
      },
    },
  };
}

/**
 * Get font asset loader rule.
 */
export function getFontLoaderRule(): RuleSetRule {
  return {
    test: /\.(woff|woff2|eot|ttf|otf)$/,
    type: 'asset/resource',
  };
}

/**
 * Get text/raw file loader rule.
 */
export function getTextLoaderRule(): RuleSetRule {
  return {
    test: /\.(html|md|text|txt)$/,
    type: 'asset/source',
  };
}

/**
 * Get raw query loader rule (?raw imports).
 */
export function getRawQueryLoaderRule(): RuleSetRule {
  return {
    resourceQuery: /raw/,
    type: 'asset/source',
  };
}

/**
 * Get peggy grammar loader rule.
 * Uses @kbn/peggy-loader to compile .peggy grammars to JavaScript parsers.
 */
export function getPeggyLoaderRule(): RuleSetRule {
  return {
    test: /\.peggy$/,
    use: {
      loader: require.resolve('@kbn/peggy-loader'),
    },
  };
}

/**
 * Get all shared module rules.
 * These rules are used by both main build and external plugins.
 */
export function getSharedModuleRules(
  repoRoot: string,
  dist: boolean,
  themeTags: ThemeTag[] = ['borealislight', 'borealisdark'],
  bundleId: string = 'kibana'
): RuleSetRule[] {
  return [
    getBabelLoaderRule(dist),
    getCssLoaderRule(dist),
    getScssLoaderRule(repoRoot, dist, themeTags, bundleId),
    getNodeModulesScssLoaderRule(repoRoot, dist),
    getImageLoaderRule(),
    getFontLoaderRule(),
    getTextLoaderRule(),
    getRawQueryLoaderRule(),
    getPeggyLoaderRule(),
  ];
}

/**
 * Shared warnings to ignore.
 * These are known warnings that don't affect functionality.
 */
export function getSharedIgnoreWarnings(): RegExp[] {
  return [
    /Can't resolve 'fs'/,
    /Can't resolve 'path'/,
    /Can't resolve 'child_process'/,
    /Can't resolve 'crypto'/,
    /Critical dependency/,
    // Third-party package export issues (not our code)
    /ESModulesLinkingWarning.*@elastic\/ems-client/,
    /export.*was not found in/,
  ];
}
