/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { APP_MAIN_SCROLL_CONTAINER_ID } from '@kbn/core-chrome-layout-constants';

/**
 * Scroll container detection and normalization utilities
 * Provides a unified API for working with both window scroll and custom scroll containers
 */

export type ScrollContainer = HTMLElement | Window;

/**
 * Type guard to check if a container is the window object
 */
export function isWindow(container: ScrollContainer): container is Window {
  return container === window;
}

/**
 * Type guard to check if a container is a custom scroll container (Element)
 */
export function isCustomScrollContainer(container: ScrollContainer): container is HTMLElement {
  return !isWindow(container) && container instanceof HTMLElement;
}

/**
 * Gets the current scroll container
 * First attempts to find a custom scroll container with ID
 * Falls back to window if not found
 *
 * @param customContainerId Optional custom ID to search for (defaults to APP_MAIN_SCROLL_CONTAINER_ID)
 * @returns The scroll container (window or Element)
 */
export function getScrollContainer(
  customContainerId: string = APP_MAIN_SCROLL_CONTAINER_ID
): ScrollContainer {
  // Try to find custom scroll container
  const customContainer = document.getElementById(customContainerId);
  if (customContainer && isCustomScrollContainer(customContainer)) {
    return customContainer;
  }

  // Fallback to window
  return window;
}

/**
 * Gets the current scroll position (scrollTop)
 */
export function getScrollTop(container: ScrollContainer): number {
  if (isWindow(container)) {
    return container.scrollY;
  } else {
    return container.scrollTop;
  }
}

/**
 * Gets the scrollable height of the container
 */
export function getScrollHeight(container: ScrollContainer): number {
  if (isWindow(container)) {
    return document.body.scrollHeight;
  } else {
    return container.scrollHeight;
  }
}

/**
 * Gets the visible height of the container
 */
export function getClientHeight(container: ScrollContainer): number {
  if (isWindow(container)) {
    return container.innerHeight;
  } else {
    return container.clientHeight;
  }
}

/**
 * Gets all scroll dimensions at once for efficiency
 */
export function getScrollDimensions(container: ScrollContainer) {
  return {
    scrollTop: getScrollTop(container),
    scrollHeight: getScrollHeight(container),
    clientHeight: getClientHeight(container),
  };
}

/**
 * Scrolls the container to a specific position
 */
export function scrollToContainer(
  container: ScrollContainer,
  top: number,
  options?: ScrollBehavior
): void {
  if (isWindow(container)) {
    container.scrollTo({
      top,
      behavior: options ?? 'auto',
    });
  } else {
    container.scrollTo({
      top,
      behavior: options ?? 'auto',
    });
  }
}

/**
 * Scrolls the container by a certain amount
 */
export function scrollByContainer(
  container: ScrollContainer,
  amount: number,
  options?: ScrollBehavior
): void {
  if (isWindow(container)) {
    container.scrollBy({
      top: amount,
      behavior: options ?? 'auto',
    });
  } else {
    container.scrollBy({
      top: amount,
      behavior: options ?? 'auto',
    });
  }
}

/**
 * Detects if the scroll container has reached the bottom of its scrollable area
 *
 * @param container The scroll container (window or Element)
 * @returns true if at bottom, false otherwise
 */
export function isAtBottomOfPage(container: ScrollContainer): boolean {
  const { scrollTop, scrollHeight, clientHeight } = getScrollDimensions(container);
  return scrollHeight - clientHeight - scrollTop <= 1; // Allow 1px tolerance
}
