/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';

/**
 * Returns true if any modifier key is active on the event, false otherwise.
 */
export const hasActiveModifierKey = (event: React.MouseEvent): boolean => {
  return event.metaKey || event.altKey || event.ctrlKey || event.shiftKey;
};

/**
 * Returns the closest anchor (`<a>`) element in the element parents (self included) up to the given container (excluded), or undefined if none is found.
 */
export const getClosestLink = (
  element: HTMLElement,
  container?: HTMLElement
): HTMLAnchorElement | undefined => {
  let current = element;
  while (true) {
    if (current.tagName.toLowerCase() === 'a') {
      return current as HTMLAnchorElement;
    }
    const parent = current.parentElement;
    if (!parent || parent === document.body || parent === container) {
      break;
    }
    current = parent;
  }
  return undefined;
};
