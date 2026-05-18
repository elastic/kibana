/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The label format for Emotion CSS-in-JS.
 * This is used by both Babel and SWC to generate consistent class names.
 * Format: [filename]--[local]
 * Example: MyComponent--container
 */
export const EMOTION_LABEL_FORMAT = '[filename]--[local]';

/**
 * Core.js version for polyfills.
 * Must match the version installed in package.json.
 */
export const CORE_JS_VERSION = '3.37.1';

/**
 * Babel runtime version for @babel/plugin-transform-runtime.
 */
export const BABEL_RUNTIME_VERSION = '^7.12.5';

/**
 * TypeScript configuration shared between transpilers.
 */
export const TYPESCRIPT_CONFIG = {
  /** Allow namespace declarations */
  allowNamespaces: true,
  /** Allow declare fields in classes */
  allowDeclareFields: true,
  /** Use legacy decorators (stage 2) */
  decoratorsLegacy: true,
} as const;

/**
 * React configuration shared between transpilers.
 */
export const REACT_CONFIG = {
  /** Enable React JSX runtime (automatic) */
  runtime: 'automatic' as const,
} as const;
