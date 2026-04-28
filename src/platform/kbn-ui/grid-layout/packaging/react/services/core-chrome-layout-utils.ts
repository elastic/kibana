/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Stub for @kbn/core-chrome-layout-utils — no-op implementation for standalone bundle.
//
// The grid-layout uses these to scroll the container during drag/resize operations.
// In a consumer app the browser's native scroll APIs are used directly, which these
// stubs delegate to.

export type ScrollContainer = HTMLElement;

export const getScrollContainer = (): HTMLElement =>
  (document.scrollingElement as HTMLElement) ?? document.documentElement;

export const getScrollPosition = (container: HTMLElement | null): number =>
  container?.scrollTop ?? 0;

export const scrollTo = (
  container: HTMLElement | null,
  options: ScrollToOptions
): void => {
  container?.scrollTo?.(options);
};

export const scrollToTop = (container: HTMLElement | null): void => {
  container?.scrollTo?.({ top: 0, behavior: 'smooth' });
};

export const scrollToBottom = (container: HTMLElement | null): void => {
  if (!container) return;
  container.scrollTo?.({ top: container.scrollHeight, behavior: 'smooth' });
};

export const getViewportHeight = (): number => window.innerHeight;

export const getViewportBoundaries = (): { top: number; bottom: number } => ({
  top: 0,
  bottom: window.innerHeight,
});

export const getScrollDimensions = (
  container: HTMLElement | null
): { scrollTop: number; scrollHeight: number; clientHeight: number } => ({
  scrollTop: container?.scrollTop ?? 0,
  scrollHeight: container?.scrollHeight ?? 0,
  clientHeight: container?.clientHeight ?? 0,
});

export const scrollBy = (container: HTMLElement | null, delta: number): void => {
  container?.scrollBy?.({ top: delta, behavior: 'smooth' });
};

export const isAtBottomOfPage = (container: HTMLElement | null): boolean => {
  if (!container) return false;
  return container.scrollTop + container.clientHeight >= container.scrollHeight - 1;
};

// High-contrast helpers — visual only, safe no-ops for standalone.
export interface HighContrastSeparatorOptions {
  side?: 'top' | 'bottom';
  width?: string;
  left?: string;
  right?: string;
}

export const getHighContrastBorder = (): string => 'none';

export const getHighContrastSeparator = (): string => '';
