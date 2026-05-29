/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Standalone type declarations for @kbn/ui-chrome-layout-constants.
 *
 * LayoutProperty is declared inline (not derived from React.CSSProperties) so
 * the published package has no React type dependency.
 * No type_validation.ts here — the types are simple enough that tsc catches drift at build time.
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
  | 'marginRight'
  | 'marginTop';

export type LayoutVarName = `${LayoutComponent}.${LayoutProperty}`;
export type ApplicationVarName = `application.${ApplicationComponent}.${LayoutProperty}`;
export type CSSVarName = LayoutVarName | ApplicationVarName;

export declare function layoutVar(name: CSSVarName, fallback?: string): string;
export declare function layoutVarName(name: CSSVarName): string;

export declare const layoutLevels: {
  content: number;
  header: number;
  footer: number;
  navigation: number;
  sidebar: number;
  banner: number;
  applicationTopBar: number;
  applicationBottomBar: number;
  debug: number;
};

export declare const APP_MAIN_SCROLL_CONTAINER_ID: string;
export declare const APP_FIXED_VIEWPORT_ID: string;
export declare const FLYOUT_SELECTOR: string;
export declare const MAIN_CONTENT_SELECTORS: string[];
export declare const SIDE_PANEL_CONTENT_GAP: number;
export declare const euiIncludeSelectorInFocusTrap: {
  prop: { 'data-eui-includes-in-flyout-focus-trap': boolean };
  selector: string;
};
