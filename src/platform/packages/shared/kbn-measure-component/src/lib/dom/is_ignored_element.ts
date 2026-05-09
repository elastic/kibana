/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  MEASURE_OVERLAY_ID,
  MOVE_OVERLAY_ID,
  GRID_OVERLAY_ID,
  GRID_SETTINGS_FLYOUT_ID,
  DEVELOPER_TOOLBAR_ID,
} from '../constants';

const IGNORED_ELEMENT_IDS = new Set([
  MEASURE_OVERLAY_ID,
  MOVE_OVERLAY_ID,
  GRID_OVERLAY_ID,
  GRID_SETTINGS_FLYOUT_ID,
  DEVELOPER_TOOLBAR_ID,
]);

const DEVTOOL_IGNORE_ATTR = '[data-devtool-ignore]';

const IGNORED_SELECTOR = [
  ...Array.from(IGNORED_ELEMENT_IDS).map((id) => `#${id}`),
  DEVTOOL_IGNORE_ATTR,
].join(',');

/**
 * Returns true if the element is, is inside, or contains a tool overlay
 * or the developer toolbar — i.e. it should be ignored by measure/move interactions.
 *
 * Elements can also be ignored by adding the `data-devtool-ignore` attribute.
 */
export const isIgnoredElement = (el: Element): boolean => {
  if (IGNORED_ELEMENT_IDS.has(el.id)) return true;
  if (el.hasAttribute('data-devtool-ignore')) return true;
  // Element is inside an ignored container
  if (el.closest(IGNORED_SELECTOR)) return true;
  // Element contains an ignored container (e.g. footer wrapping the toolbar)
  if (el.querySelector(IGNORED_SELECTOR)) return true;
  return false;
};
