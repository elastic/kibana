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
