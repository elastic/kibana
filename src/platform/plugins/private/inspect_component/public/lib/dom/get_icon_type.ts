/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EUI_DATA_ICON_TYPE } from '../constants';

/**
 * Get the EUI icon type from a DOM element.
 * It checks if the target is an SVG element or looks for an SVG child element.
 * @param {HTMLElement} domElement The DOM element to check.
 * @return {string | null} The EUI icon type, or null if not found.
 */
export const getIconType = (domElement: HTMLElement): string | null => {
  return domElement.querySelector('svg')?.getAttribute(EUI_DATA_ICON_TYPE) || null;
};
