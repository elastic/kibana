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
 * Options for Node.js SWC configuration
 */
export interface NodeSwcOptions {
  /** Whether this is a production build */
  production?: boolean;
}

/**
 * SWC configuration for Node.js server-side code
 */
export interface NodeSwcConfig {
  jsc: {
    parser: {
      syntax: 'typescript';
      tsx: boolean;
      decorators: boolean;
    };
    transform: {
      legacyDecorator: boolean;
      decoratorMetadata: boolean;
    };
    target: string;
    keepClassNames: boolean;
    externalHelpers: boolean;
  };
  sourceMaps?: boolean | 'inline';
  inlineSourcesContent?: boolean;
  module?: {
    type: 'commonjs';
    ignoreDynamic?: boolean;
  };
  minify?: boolean;
}

/**
 * Get SWC configuration for Node.js server-side builds.
 *
 * This configuration is designed to be equivalent to @kbn/babel-preset/node_preset.js
 * but using SWC for faster transpilation.
 *
 * Key features:
 * - TypeScript with decorators (legacy mode)
 * - CommonJS output (for Node.js require compatibility)
 * - No CSS-in-JS transformations (server-side doesn't need them)
 *
 * @param options - Configuration options
 * @returns SWC configuration for Node.js
 */
export function getNodeSwcConfig(options: NodeSwcOptions = {}): NodeSwcConfig {
  const { production = false } = options;
  const sharedConfig = getSharedConfig();

  return {
    jsc: {
      parser: {
        syntax: 'typescript',
        tsx: true, // Allow TSX even in Node, for shared components
        decorators: true,
      },
      transform: {
        legacyDecorator: sharedConfig.typescript.decoratorsLegacy,
        decoratorMetadata: true,
        // No React transform needed for server-side
      },
      // Target current Node.js version for server builds
      target: 'es2022',
      keepClassNames: true,
      externalHelpers: true,
    },
    sourceMaps: production ? false : 'inline',
    inlineSourcesContent: !production,
    module: {
      type: 'commonjs',
      ignoreDynamic: true,
    },
    minify: false, // Server code doesn't need minification
  };
}
