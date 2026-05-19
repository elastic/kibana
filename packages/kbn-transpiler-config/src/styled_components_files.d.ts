/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Re-export styled-components file patterns from @kbn/babel-preset.
 * The original list in @kbn/babel-preset/styled_components_files.js is the
 * single source of truth, maintained there for ESLint compatibility.
 *
 * This list is used by:
 * - @kbn/babel-preset (for applying styled-components Babel plugin)
 * - @kbn/eslint-config (for linting rules)
 *
 * Note: With SWC, we don't use a separate styled-components plugin.
 * styled-components works at runtime without build-time optimizations.
 *
 * @see @kbn/babel-preset/styled_components_files.js
 */
declare const USES_STYLED_COMPONENTS: any;
export { USES_STYLED_COMPONENTS };
/**
 * Utility function to check if a file path uses styled-components.
 * This is useful for both Babel and SWC to determine which CSS-in-JS
 * transformation to apply.
 *
 * @param filePath - The absolute or relative path to check
 * @returns true if the file should use styled-components, false for Emotion
 */
export declare function usesStyledComponents(filePath: string): boolean;
