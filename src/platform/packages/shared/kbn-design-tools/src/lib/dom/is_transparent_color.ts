/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TRANSPARENT_COLOR_RE } from '../constants';

/**
 * Checks whether a CSS color value represents a transparent background
 * (empty, literal "transparent", or rgba(0,0,0,0)).
 *
 * @param color - The CSS color value to check.
 * @returns Whether the color is transparent.
 */
export const isTransparentColor = (color: string): boolean =>
  !color || color === 'transparent' || TRANSPARENT_COLOR_RE.test(color);
