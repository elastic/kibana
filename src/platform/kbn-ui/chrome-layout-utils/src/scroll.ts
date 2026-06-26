/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { APP_MAIN_SCROLL_CONTAINER_ID } from '@kbn/ui-chrome-layout-constants';

export type ScrollContainer = HTMLElement;

export const getScrollContainer = (): ScrollContainer => {
  const appScroll = document.getElementById(APP_MAIN_SCROLL_CONTAINER_ID);
  if (appScroll instanceof HTMLElement) {
    return appScroll;
  }
  return document.documentElement;
};

export const getViewportHeight = (container: ScrollContainer = getScrollContainer()): number => {
  return container.clientHeight;
};

export const getViewportBoundaries = (
  container: ScrollContainer = getScrollContainer()
): { top: number; bottom: number } => {
  const rect = container.getBoundingClientRect();
  return {
    top: rect.top,
    bottom: rect.top + container.clientHeight,
  };
};

export const getScrollPosition = (container: ScrollContainer = getScrollContainer()): number => {
  return container.scrollTop;
};

export const scrollTo = (
  opts: { top: number; behavior?: ScrollBehavior },
  container: ScrollContainer = getScrollContainer()
) => {
  container.scrollTo({ top: opts.top, behavior: opts.behavior });
};

export const scrollToTop = (
  opts: { behavior?: ScrollBehavior } = {},
  container: ScrollContainer = getScrollContainer()
) => {
  scrollTo({ top: 0, behavior: opts.behavior }, container);
};

export const scrollToBottom = (
  opts: { behavior?: ScrollBehavior } = {},
  container: ScrollContainer = getScrollContainer()
) => {
  scrollTo({ top: container.scrollHeight, behavior: opts.behavior }, container);
};

export const getScrollDimensions = (
  container: ScrollContainer = getScrollContainer()
): { scrollTop: number; scrollHeight: number; clientHeight: number } => {
  return {
    scrollTop: container.scrollTop,
    scrollHeight: container.scrollHeight,
    clientHeight: container.clientHeight,
  };
};

export const scrollBy = (
  opts: { top: number; behavior?: ScrollBehavior },
  container: ScrollContainer = getScrollContainer()
) => {
  container.scrollBy({ top: opts.top, behavior: opts.behavior });
};

export const isAtBottomOfPage = (container: ScrollContainer = getScrollContainer()): boolean => {
  const { scrollTop, scrollHeight, clientHeight } = getScrollDimensions(container);
  return scrollHeight - clientHeight - scrollTop <= 1;
};
