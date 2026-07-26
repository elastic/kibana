/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getSharedConfig } from '@kbn/transpiler-config';

/**
 * Options for browser SWC configuration
 */
export interface BrowserSwcOptions {
  /** Whether this is a production build */
  production?: boolean;
}

/**
 * SWC loader options for RSPack/Webpack
 * This type is compatible with swc-loader
 */
export interface SwcLoaderOptions {
  jsc: {
    parser: {
      syntax: 'typescript';
      tsx: boolean;
      decorators: boolean;
    };
    transform: {
      legacyDecorator: boolean;
      decoratorMetadata: boolean;
      react?: {
        runtime: 'automatic' | 'classic';
        development?: boolean;
        importSource?: string;
      };
    };
    target: string;
    keepClassNames: boolean;
    externalHelpers: boolean;
  };
  sourceMaps?: boolean | 'inline';
  inlineSourcesContent?: boolean;
  module?: {
    type: 'es6' | 'commonjs';
    ignoreDynamic?: boolean;
  };
  minify?: boolean;
}

/**
 * Get SWC configuration for browser builds.
 *
 * This configuration is designed to be equivalent to @kbn/babel-preset/webpack_preset.js
 * but using SWC for faster transpilation.
 *
 * Key features:
 * - TypeScript with decorators (legacy mode)
 * - React automatic runtime with Emotion's JSX (importSource: '@emotion/react')
 * - Emotion CSS-in-JS support via the JSX runtime (no plugin needed)
 *
 * Note: styled-components files work without a build plugin - they just
 * won't have build-time optimizations. This is acceptable as Kibana is
 * migrating to Emotion.
 *
 * @param options - Configuration options
 * @returns SWC loader options compatible with swc-loader
 */
export function getBrowserSwcConfig(options: BrowserSwcOptions = {}): SwcLoaderOptions {
  const { production = false } = options;
  const sharedConfig = getSharedConfig();

  return {
    jsc: {
      parser: {
        syntax: 'typescript',
        tsx: true,
        decorators: true,
      },
      transform: {
        legacyDecorator: sharedConfig.typescript.decoratorsLegacy,
        decoratorMetadata: true,
        react: {
          runtime: sharedConfig.react.runtime,
          development: !production,
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
    sourceMaps: production ? false : 'inline',
    inlineSourcesContent: !production,
    module: {
      type: 'es6',
      ignoreDynamic: true,
    },
    minify: production,
  };
}
