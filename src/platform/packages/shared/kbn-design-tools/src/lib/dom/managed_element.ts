/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEVTOOL_LIVE_ATTR } from '../constants';

/**
 * Return the meaningful content root for a managed element.
 *
 * Live elements are wrapped in a container div that holds the `data-devtool-live`
 * attribute. The actual component content is the first child of that wrapper.
 * Static clones and regular DOM elements use themselves as the content root.
 *
 * This centralizes the `target.hasAttribute(DEVTOOL_LIVE_ATTR) && target.firstElementChild`
 * pattern used in edit_modal.tsx and elsewhere.
 */
export const getContentRoot = (target: HTMLElement): HTMLElement => {
  if (target.hasAttribute(DEVTOOL_LIVE_ATTR) && target.firstElementChild) {
    return target.firstElementChild as HTMLElement;
  }
  return target;
};

/**
 * Check whether an element is a live React component wrapper.
 */
export const isLiveElement = (target: HTMLElement): boolean =>
  target.hasAttribute(DEVTOOL_LIVE_ATTR);
