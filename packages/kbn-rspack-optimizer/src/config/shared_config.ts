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
import { getSharedConfig } from '@kbn/transpiler-config';
import type { ThemeTag } from '../types';

/**
 * Shared resolve configuration for all RSPack builds.
 * Used by both main Kibana build and external plugins.
 */
export function getSharedResolveConfig(repoRoot: string): Configuration['resolve'] {
  return {
    extensions: ['.js', '.ts', '.tsx', '.json'],
    mainFields: ['browser', 'module', 'main'],
    alias: {
      'react-dom$': 'react-dom/profiling',
      'scheduler/tracing': 'scheduler/tracing-profiling',
      buffer: [
        Path.resolve(repoRoot, 'node_modules/node-stdlib-browser/node_modules/buffer'),
        require.resolve('buffer'),
      ],
      punycode: [
        Path.resolve(repoRoot, 'node_modules/node-stdlib-browser/node_modules/punycode'),
        require.resolve('punycode'),
      ],
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
 * Get SWC loader rule for JavaScript/TypeScript files.
 *
 * Uses RSPack's native `builtin:swc-loader` for maximum performance.
 * This is faster than the webpack `swc-loader` because it's implemented
 * in Rust and integrated directly into RSPack.
 *
 * Uses @swc/plugin-emotion for CSS-in-JS. styled-components files
 * will still work at runtime - we just won't have build-time optimizations
 * like better debugging labels for styled-components.
 *
 * This is acceptable because:
 * 1. Kibana is migrating from styled-components to Emotion
 * 2. styled-components still works without a build plugin
 * 3. Simplifies the configuration significantly
 *
 * This replaces the previous babel-loader configuration.
 */
/**
 * Common SWC options for both TypeScript and JavaScript files.
 * Uses @kbn/transpiler-config for consistent settings across Babel and SWC.
 */
function getSwcOptions(dist: boolean) {
  const sharedConfig = getSharedConfig();

  return {
    jsc: {
      parser: {
        syntax: 'typescript',
        tsx: true,
        decorators: true,
      },
      transform: {
        // Use shared TypeScript config for decorator settings
        legacyDecorator: sharedConfig.typescript.decoratorsLegacy,
        decoratorMetadata: true,
        react: {
          // Use shared React config
          runtime: sharedConfig.react.runtime,
          development: !dist,
          // Use Emotion's JSX runtime to handle the css prop natively.
          // This works because @emotion/react/jsx-runtime is externalized
          // to __kbnSharedDeps__.EmotionReact (which exports jsx, jsxs, Fragment).
          importSource: '@emotion/react',
        },
      },
      // No plugins needed - Emotion's JSX runtime handles css prop directly
      // Target ES2020 for browser builds (matches Kibana's browserslist)
      target: 'es2020',
      // Keep class names for debugging and error messages
      keepClassNames: true,
      // Use @swc/helpers for smaller output (like @babel/plugin-transform-runtime)
      externalHelpers: true,
    },
    sourceMaps: !dist,
    inlineSourcesContent: !dist,
  };
}

export function getSwcLoaderRules(dist: boolean): RuleSetRule[] {
  const swcOptions = getSwcOptions(dist);

  return [
    // TypeScript files - SWC only
    {
      test: /\.tsx?$/,
      exclude: /node_modules/,
      loader: 'builtin:swc-loader',
      options: swcOptions,
    },
    // JavaScript files - require interop loader + SWC
    // The interop loader transforms CJS require() calls to handle ESM default exports
    // This matches webpack's babel-plugin-transform-require-default behavior
    {
      test: /\.jsx?$/,
      exclude: /node_modules/,
      use: [
        {
          loader: 'builtin:swc-loader',
          options: swcOptions,
        },
        {
          // Runs first (loaders execute bottom to top)
          // Transforms: const foo = require('bar') -> const foo = __kbnInteropDefault(require('bar'))
          loader: Path.resolve(__dirname, '../loaders/require_interop_loader.ts'),
        },
      ],
    },
  ];
}

/**
 * Get the Babel loader configuration (fallback for compatibility).
 * Used when SWC is not available or has issues.
 * @deprecated Prefer getSwcLoaderRules() for better performance
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
 *
 * @param repoRoot - Root of the Kibana repository
 * @param dist - Whether this is a production build
 * @param themeTags - Theme tags to generate (default: light and dark)
 * @param bundleId - Bundle ID for theme loader
 * @param useBabel - Use Babel instead of SWC (default: false)
 */
export function getSharedModuleRules(
  repoRoot: string,
  dist: boolean,
  themeTags: ThemeTag[] = ['borealislight', 'borealisdark'],
  bundleId: string = 'kibana',
  useBabel: boolean = false
): RuleSetRule[] {
  // Use SWC by default for better performance.
  // The css prop is handled by Emotion's JSX runtime (importSource: '@emotion/react')
  // which is externalized to use the shared Emotion instance.
  const jsRules = useBabel ? [getBabelLoaderRule(dist)] : getSwcLoaderRules(dist);

  return [
    ...jsRules,
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
    // Same as legacy webpack optimizer (STATS_WARNINGS_FILTER)
    /export .* was not found in/,
    /chunk .* \[mini-css-extract-plugin\].*Conflicting order between/,
    // RSPack-specific: Node.js globals mocking (webpack silently mocks these)
    /__dirname.*is used and has been mocked/,
    /__filename.*is used and has been mocked/,
  ];
}
