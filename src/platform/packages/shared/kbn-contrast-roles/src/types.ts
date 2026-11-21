/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type Hex = string;
export interface Oklch {
  L: number;
  C: number;
  h: number;
}

export type Role = 'faint' | 'muted' | 'base' | 'strong' | 'ink';
export const ROLES: Role[] = ['faint', 'muted', 'base', 'strong', 'ink'];

export interface HueInput {
  name: string;
  base?: Hex;
  angle?: number;
}
export interface Theme {
  surfaces: { light: Hex; dark: Hex };
  hues: HueInput[];
  neutralTint?: Hex;
}
export interface Hue {
  name: string;
  angle: number;
  anchor?: Hex;
}

export type StackPair = 'muted' | 'strong';
export interface Params {
  lc: Record<Role, number>;
  base: { from: 'anchor' | 'model'; cuspPull: number; cuspRef: number };
  chroma: { ceiling: number; mode: 'cap' | 'even'; taper: number; taperDark: number };
  ramp: { from: number; to: number };
  lines: { order: 'split' | 'intertwined' };
  stack: { pair: StackPair };
}

// A hue's exceptions to the system (`hueRules` in corrections.ts). surfaceL: the surface's OKLab L.
export interface HueRules {
  hueAt: (L: number, baseL: number) => number; // the hue at lightness L; plain: the hue's angle
  baseChroma: (surfaceL: number) => number; // share of base's chroma; plain: 1
  faintChroma: (surfaceL: number) => number | null; // cap on faint's chroma; plain: none
  sharedMuted: boolean; // muted is one color in both modes, like base; plain: false
  pair: (pair: StackPair) => StackPair; // the role stacked with base; plain: the one asked for
}

export type Color = Oklch & { hex: Hex };
// L0: lightness before the hue correction.
export type BaseColor = Color & { L0: number };

export type RoleColors = { name: string; angle: number } & Record<Role, Hex>;
export interface Palettes {
  roles: RoleColors[];
  intertwined: Hex[];
  lines: Hex[];
  sequential: (hue: string, n: number) => Hex[];
  diverging: (from: string, to: string, n: number) => Hex[];
}
