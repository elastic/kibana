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

const isHTMLElement = (container: ScrollContainer): container is HTMLElement => {
  return container instanceof HTMLElement || !isWindow(container);
};

const isWindow = (container: ScrollContainer): container is Window => {
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
  if (isHTMLElement(container)) {
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
  const scrollHeight = isHTMLElement(container)
    ? container.scrollHeight
    : document.documentElement.scrollHeight;
  scrollTo({ top: scrollHeight, behavior: opts.behavior }, container);
};
