/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MonochromeIcons } from './monochrome_icons';

/**
 * Pin the set of base-type step ids that MUST be theme-adaptive in the Monaco editor.
 *
 * These ids correspond to SVGs whose paths have no `fill` attribute (defaulting to black)
 * and therefore MUST go through the `mask-image` + `background-color: currentColor` CSS path
 * (controlled by MonochromeIcons) rather than `background-image`.
 *
 * If you add a new base-type step with a black-fill SVG icon, add it here and to MonochromeIcons.
 */
const BASE_TYPE_MONOCHROME_IDS = [
  'while',
  // dedicated SVG glyphs (database.svg, product_streams_wired.svg, user.svg)
  'data.set',
  'switch',
  'waitForInput',
  'waitForApproval',
  // http falls back to plugs.svg (no fill); loop steps use controls.svg (no fill)
  'http',
  'loop.break',
  'loop.continue',
];

describe('MonochromeIcons', () => {
  it.each(BASE_TYPE_MONOCHROME_IDS)(
    '"%s" is in MonochromeIcons so its SVG icon is masked with currentColor in dark mode',
    (id) => {
      expect(MonochromeIcons.has(id)).toBe(true);
    }
  );
});
