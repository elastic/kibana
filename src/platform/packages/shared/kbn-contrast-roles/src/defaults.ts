/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Params } from './types';

export const DEFAULT_PARAMS: Params = {
  lc: {
    faint: 5, // fill: metric backgrounds, table cells, badges, area fills. Just off the surface, below APCA's Lc 7.3 floor
    muted: 30, // quieter mark: the second segment per hue in stacks. Set by eye, the same in both modes
    base: 50, // mark: lines, bars, points. About L 0.71 on both white and navy, so one hex works in both modes
    strong: 70, // second mark tier for lines
    ink: 75, // text and icons on a faint fill, measured against faint (APCA's body-text minimum)
  },
  base: {
    from: 'anchor', // 'anchor': base is the hue's given color (a product constraint); 'model': for hues without one
    cuspPull: 0.28,
    cuspRef: 0.65,
  },
  chroma: {
    ceiling: 0.165, // most chroma base can carry (EUI's vis colors top out near 0.165)
    mode: 'cap', // 'cap' (cap from base, tapers) or 'even' (one chroma per role across hues, as Harmonizer does)
    taper: 0.5, // 'cap': how fast chroma fades for colors lighter than base (against neon teal and yellow pastels)
    taperDark: 0.25, // 'cap': the same for colors darker than base. Softer: dark yellow with little chroma reads as olive
  },
  ramp: {
    from: 15, // Lc of a ramp's first step, just off the surface
    to: 50, // Lc of a ramp's last step; Kibana's ramps end at the base color
  },
  lines: {
    order: 'intertwined', // base, strong per hue, as stacks pair base with muted; 'split': every base, then every strong
  },
  stack: {
    pair: 'muted', // the role stacked with base; 'strong': the far side of base, for more contrast within a pair
  },
};
