import type React from 'react';
export type LayoutComponent = 'banner' | 'header' | 'footer' | 'navigation' | 'sidebar' | 'application';
export type ApplicationComponent = 'topBar' | 'bottomBar' | 'content';
export type LayoutProperty = keyof Pick<React.CSSProperties, 'top' | 'bottom' | 'left' | 'right' | 'height' | 'width' | 'marginBottom' | 'marginRight' | 'marginTop'>;
export type LayoutVarName = `${LayoutComponent}.${LayoutProperty}`;
export type ApplicationVarName = `application.${ApplicationComponent}.${LayoutProperty}`;
export type CSSVarName = LayoutVarName | ApplicationVarName;
/**
 * Helper function to generate CSS custom property variables with type safety.
 * Automatically detects the correct prefix (--kbn-layout-- or --kbn-application--)
 * based on the variable name pattern.
 *
 * @param name - The CSS variable name in dot notation
 * @param fallback - Optional fallback value
 * @returns The complete CSS var() expression
 *
 * @example
 * ```typescript
 * // Layout variables (uses --kbn-layout-- prefix)
 * layoutVar('banner.top', '0px')      // var(--kbn-layout--banner-top, 0px)
 * layoutVar('header.height')          // var(--kbn-layout--header-height)
 *
 * // Application variables (uses --kbn-application-- prefix)
 * layoutVar('application.topBar.height')         // var(--kbn-application--top-bar-height)
 * layoutVar('application.content.top', '0px')    // var(--kbn-application--content-top, 0px)
 * ```
 */
export declare const layoutVar: (name: CSSVarName, fallback?: string) => string;
/**
 * Helper function to get the CSS variable name with type safety.
 * Returns the complete CSS variable name (with prefix) for use in template strings.
 *
 * @param name - The CSS variable name in dot notation
 * @returns The complete CSS variable name with appropriate prefix
 *
 * @example
 * ```typescript
 * // Get variable names for definitions
 * const topBarVar = layoutVarName('application.topBar.height');
 * // Returns: "--kbn-application--top-bar-height"
 *
 * // Use in template strings
 * const styles = css`
 *   ${layoutVarName('banner.height')}: 50px;
 *   ${layoutVarName('application.topBar.height')}: 40px;
 * `;
 *
 * // Use with DOM API
 * element.style.setProperty(layoutVarName('banner.height'), '50px');
 * ```
 */
export declare const layoutVarName: (name: CSSVarName) => string;
