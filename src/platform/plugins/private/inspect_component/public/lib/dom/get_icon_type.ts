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
 * Get the EUI icon type from a DOM node.
 * It checks if the target is an SVG element or looks for an SVG child element.
 * @param {HTMLElement | SVGElement} target The DOM node to check.
 * @return {string | undefined} The EUI icon type, or undefined if not found.
 */
export const getIconType = (target: HTMLElement | SVGElement): string | undefined => {
  if (target instanceof SVGElement) {
    return target.getAttribute(EUI_DATA_ICON_TYPE) || undefined;
  }
  return target.querySelector('svg')?.getAttribute(EUI_DATA_ICON_TYPE) || undefined;
};
