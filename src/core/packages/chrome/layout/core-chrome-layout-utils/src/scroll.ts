/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { APP_MAIN_SCROLL_CONTAINER_ID } from '@kbn/core-chrome-layout-constants';

export type ScrollContainer = HTMLElement | Window;

/**
 * Type guard to check if a scroll container is an HTMLElement.
 * @param container - The container to check
 * @returns true if the container is an HTMLElement
 */
export const isAppScroll = (container: ScrollContainer): container is HTMLElement => {
  return container instanceof HTMLElement || !isWindowScroll(container);
};

/**
 * Type guard to check if a scroll container is the window object.
 * @param container - The container to check
 * @returns true if the container is the window object
 */
export const isWindowScroll = (container: ScrollContainer): container is Window => {
  return container === window;
};

/**
 * Gets the main scroll container element for the application.
 * @returns The scroll container element if it exists, otherwise the window object
 */
export const getScrollContainer = (): ScrollContainer => {
  return document.getElementById(APP_MAIN_SCROLL_CONTAINER_ID) || window;
};

/**
 * Gets the visible height of a scroll container's viewport.
 * @param container - The container to measure. Defaults to the main application scroll container
 * @returns The viewport height in pixels
 */
export const getViewportHeight = (container: ScrollContainer = getScrollContainer()): number => {
  if (isAppScroll(container)) {
    return container.clientHeight;
  } else {
    return window.innerHeight;
  }
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
  if (isAppScroll(container)) {
    const rect = container.getBoundingClientRect();
    return {
      top: rect.top,
      bottom: rect.top + container.clientHeight,
    };
  } else {
    return {
      top: 0,
      bottom: window.innerHeight,
    };
  }
};

/**
 * Gets the current scroll position of a container.
 * @param container - The container to measure. Defaults to the main application scroll container
 * @returns The current vertical scroll position in pixels
 */
export const getScrollPosition = (container: ScrollContainer = getScrollContainer()): number => {
  if (isAppScroll(container)) {
    return container.scrollTop;
  } else {
    return window.scrollY;
  }
};

/**
 * Scrolls a container to a specific vertical position.
 * Handles both HTMLElement and Window scroll targets transparently.
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
  if (isAppScroll(container)) {
    container.scrollTo({ top: opts.top, behavior: opts.behavior });
  } else {
    window.scrollTo({ top: opts.top, behavior: opts.behavior });
  }
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
  const scrollHeight = isAppScroll(container)
    ? container.scrollHeight
    : document.documentElement.scrollHeight;
  scrollTo({ top: scrollHeight, behavior: opts.behavior }, container);
};
