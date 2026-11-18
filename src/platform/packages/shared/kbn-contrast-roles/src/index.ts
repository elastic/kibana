/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Contrast roles public API. No React, no EUI.
export type {
  BaseColor,
  Color,
  Hex,
  Hue,
  HueInput,
  Oklch,
  Palettes,
  Params,
  Role,
  RoleColors,
  Theme,
} from './types';
export { ROLES } from './types';
export { DEFAULT_PARAMS } from './defaults';
export { createContrastRoles, type ContrastRoles } from './contrast_roles';
export { cuspOffset } from './corrections';
export {
  apcaLc,
  contrast,
  hexToOklch,
  hexToRgb255,
  maxChroma,
  oklchToHex,
  oklchToRgb255,
  shell,
  SHELL_STEPS,
} from './color';
export { NON_TEXT, pairDifference, requiredLc, type ElementKind } from './checks';
