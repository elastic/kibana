/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type LayoutComponent =
  | 'banner'
  | 'header'
  | 'footer'
  | 'navigation'
  | 'sidebar'
  | 'application';
export type ApplicationComponent = 'topBar' | 'bottomBar' | 'content';
export type LayoutProperty =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'height'
  | 'width'
  | 'marginBottom'
  | 'marginRight';

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
export const layoutVar = (name: CSSVarName, fallback?: string): string => {
  const varName = layoutVarName(name);
  return fallback ? `var(${varName}, ${fallback})` : `var(${varName})`;
};

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
export const layoutVarName = (name: CSSVarName): string => {
  const isAppVar = name.startsWith('application.') && name.split('.').length === 3;

  if (isAppVar) {
    // Convert "application.topBar.height" to "top-bar-height"
    const parts = name.split('.');
    const component = parts[1]; // "topBar"
    const property = parts[2]; // "height"
    const kebabComponent = component.replace(/([A-Z])/g, '-$1').toLowerCase();
    return `--kbn-application--${kebabComponent}-${property}`;
  } else {
    // Convert "header.height" to "header-height"
    const kebabName = name.replace('.', '-');
    return `--kbn-layout--${kebabName}`;
  }
};
