/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { APP_MAIN_SCROLL_CONTAINER_ID } from '@kbn/core-chrome-layout-constants';

export type ScrollContainer = HTMLElement;

/**
 * Gets the main scroll container element for the application.
 * @returns The scroll container element (either the app scroll container or document.documentElement for window scroll)
 */
export const getScrollContainer = (): ScrollContainer => {
  const appScroll = document.getElementById(APP_MAIN_SCROLL_CONTAINER_ID);
  if (appScroll instanceof HTMLElement) {
    return appScroll;
  }
  return document.documentElement;
};

/**
 * Gets the visible height of a scroll container's viewport.
 * @param container - The container to measure. Defaults to the main application scroll container
 * @returns The viewport height in pixels
 */
export const getViewportHeight = (container: ScrollContainer = getScrollContainer()): number => {
  return container.clientHeight;
};

/**
 * Gets the vertical boundaries of a scroll container's viewport.
 * Useful for checking if elements are visible within the viewport.
 * @param container - The container to measure. Defaults to the main application scroll container
 * @returns An object with top and bottom pixel values relative to the document
 */
export const getViewportBoundaries = (
  container: ScrollContainer = getScrollContainer()
): { top: number; bottom: number } => {
  const rect = container.getBoundingClientRect();
  return {
    top: rect.top,
    bottom: rect.top + container.clientHeight,
  };
};

/**
 * Gets the current scroll position of a container.
 * @param container - The container to measure. Defaults to the main application scroll container
 * @returns The current vertical scroll position in pixels
 */
export const getScrollPosition = (container: ScrollContainer = getScrollContainer()): number => {
  return container.scrollTop;
};

/**
 * Scrolls a container to a specific vertical position.
 * @param opts - Scroll options
 * @param opts.top - The vertical position to scroll to in pixels
 * @param opts.behavior - The scroll behavior ('auto' or 'smooth'). Default is 'auto'
 * @param container - The container to scroll. Defaults to the main application scroll container
 */
export const scrollTo = (
  opts: {
    top: number;
    behavior?: ScrollBehavior;
  },
  container: ScrollContainer = getScrollContainer()
) => {
  container.scrollTo({ top: opts.top, behavior: opts.behavior });
};

/**
 * Scrolls a container to the top.
 * @param opts - Scroll options
 * @param opts.behavior - The scroll behavior ('auto' or 'smooth'). Default is 'auto'
 * @param container - The container to scroll. Defaults to the main application scroll container
 */
export const scrollToTop = (
  opts: {
    behavior?: ScrollBehavior;
  } = {},
  container: ScrollContainer = getScrollContainer()
) => {
  scrollTo({ top: 0, behavior: opts.behavior }, container);
};

/**
 * Scrolls a container to the bottom.
 * @param opts - Scroll options
 * @param opts.behavior - The scroll behavior ('auto' or 'smooth'). Default is 'auto'
 * @param container - The container to scroll. Defaults to the main application scroll container
 */
export const scrollToBottom = (
  opts: {
    behavior?: ScrollBehavior;
  } = {},
  container: ScrollContainer = getScrollContainer()
) => {
  scrollTo({ top: container.scrollHeight, behavior: opts.behavior }, container);
};

/**
 * Gets all scroll dimensions of a container at once for efficiency.
 * @param container - The container to measure. Defaults to the main application scroll container
 * @returns An object with scrollTop, scrollHeight, and clientHeight
 */
export const getScrollDimensions = (
  container: ScrollContainer = getScrollContainer()
): { scrollTop: number; scrollHeight: number; clientHeight: number } => {
  return {
    scrollTop: container.scrollTop,
    scrollHeight: container.scrollHeight,
    clientHeight: container.clientHeight,
  };
};

/**
 * Scrolls a container by a relative amount.
 * @param opts - Scroll options
 * @param opts.top - The number of pixels to scroll (positive = down, negative = up)
 * @param opts.behavior - The scroll behavior ('auto' or 'smooth'). Default is 'auto'
 * @param container - The container to scroll. Defaults to the main application scroll container
 */
export const scrollBy = (
  opts: {
    top: number;
    behavior?: ScrollBehavior;
  },
  container: ScrollContainer = getScrollContainer()
) => {
  container.scrollBy({
    top: opts.top,
    behavior: opts.behavior,
  });
};

/**
 * Detects if a scroll container has reached the bottom of its scrollable area.
 * @param container - The container to check. Defaults to the main application scroll container
 * @returns true if the container is scrolled to the bottom, false otherwise
 */
export const isAtBottomOfPage = (container: ScrollContainer = getScrollContainer()): boolean => {
  const { scrollTop, scrollHeight, clientHeight } = getScrollDimensions(container);
  return scrollHeight - clientHeight - scrollTop <= 1; // Allow 1px tolerance
};
