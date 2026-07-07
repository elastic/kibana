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
 * Get the EUI icon type from a HTML element.
 * @param {HTMLElement} element The HTML element to check.
 * @return {string | null} The EUI icon type, or null if not found.
 */
export const getIconType = (element: HTMLElement): string | null => {
  return element.querySelector('svg')?.getAttribute(EUI_DATA_ICON_TYPE) || null;
};
