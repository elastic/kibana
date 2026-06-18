/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';

export type ScrollContainer = HTMLElement;

export declare function getScrollContainer(): ScrollContainer;
export declare function getViewportHeight(container?: ScrollContainer): number;
export declare function getViewportBoundaries(container?: ScrollContainer): {
  top: number;
  bottom: number;
};
export declare function getScrollPosition(container?: ScrollContainer): number;
export declare function getScrollDimensions(container?: ScrollContainer): {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
};
export declare function scrollTo(
  opts: { top: number; behavior?: ScrollBehavior },
  container?: ScrollContainer
): void;
export declare function scrollToTop(
  opts?: { behavior?: ScrollBehavior },
  container?: ScrollContainer
): void;
export declare function scrollToBottom(
  opts?: { behavior?: ScrollBehavior },
  container?: ScrollContainer
): void;
export declare function scrollBy(
  opts: { top: number; behavior?: ScrollBehavior },
  container?: ScrollContainer
): void;
export declare function isAtBottomOfPage(container?: ScrollContainer): boolean;

export interface HighContrastSeparatorOptions {
  side?: 'top' | 'bottom';
  width?: string;
  left?: string;
  right?: string;
}

export declare function getHighContrastBorder(euiThemeContext: UseEuiTheme): string;
export declare function getHighContrastSeparator(
  euiThemeContext: UseEuiTheme,
  options?: HighContrastSeparatorOptions
): string;
