/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Shared transpiler configuration that can be consumed by both Babel and SWC.
 * This ensures consistent behavior across different transpilers.
 */
export interface SharedTranspilerConfig {
  /** TypeScript parser configuration */
  typescript: {
    allowNamespaces: boolean;
    allowDeclareFields: boolean;
    decoratorsLegacy: boolean;
  };
  /** React transformation configuration */
  react: {
    runtime: 'automatic' | 'classic';
  };
  /** Emotion CSS-in-JS configuration */
  emotion: {
    labelFormat: string;
  };
  /** styled-components file patterns (for Babel overrides) */
  styledComponents: {
    /** RegExp patterns for files using styled-components */
    patterns: RegExp[];
  };
  /** Polyfill configuration */
  polyfills: {
    coreJsVersion: string;
  };
  /** Babel-specific additional configuration */
  babel: {
    runtimeVersion: string;
  };
}
/**
 * Get the shared transpiler configuration.
 * This is the single source of truth for transpiler settings.
 *
 * @returns SharedTranspilerConfig - Configuration object for both Babel and SWC
 */
export declare function getSharedConfig(): SharedTranspilerConfig;
