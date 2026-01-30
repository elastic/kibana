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
 * Get SCSS loader rule with EUI globals.
 * Includes all necessary paths for @elastic/eui-theme-borealis resolution.
 */
export function getScssLoaderRule(repoRoot: string, dist: boolean): RuleSetRule {
  // Paths for SCSS imports - need to include node_modules for @elastic packages
  const nodeModulesPath = Path.resolve(repoRoot, 'node_modules');

  return {
    test: /\.scss$/,
    type: 'javascript/auto', // Use loader chain, not native CSS parsing
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
            // Include paths for resolving @elastic/eui-theme-borealis and other packages
            includePaths: [
              nodeModulesPath,
              Path.resolve(repoRoot, 'src/core/public/styles'),
              // Also add the packages directory for local package resolution
              Path.resolve(repoRoot, 'packages'),
            ],
            // Load paths for sass-embedded (modern Sass API)
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
 */
export function getPeggyLoaderRule(): RuleSetRule {
  return {
    test: /\.peggy$/,
    type: 'asset/source',
  };
}

/**
 * Get all shared module rules.
 * These rules are used by both main build and external plugins.
 */
export function getSharedModuleRules(repoRoot: string, dist: boolean): RuleSetRule[] {
  return [
    getBabelLoaderRule(dist),
    getCssLoaderRule(dist),
    getScssLoaderRule(repoRoot, dist),
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
