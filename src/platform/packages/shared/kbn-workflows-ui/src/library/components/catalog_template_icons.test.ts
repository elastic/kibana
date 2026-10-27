/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getVisibleStepCount } from './catalog_template_icons';

const sizes = { icon: 16, gap: 12, divider: 9 };

describe('getVisibleStepCount', () => {
  it('returns the cap when the width is unknown', () => {
    expect(getVisibleStepCount(0, 2, 5, sizes)).toBe(4);
    expect(getVisibleStepCount(0, 2, 3, sizes)).toBe(3);
  });

  it('keeps four step icons and the badge on a wide card', () => {
    expect(getVisibleStepCount(340, 2, 5, sizes)).toBe(4);
  });

  it('drops step icons so the row and the badge fit a narrow card', () => {
    // 2 triggers + divider + 4 steps + "+1" badge need 213px.
    expect(getVisibleStepCount(205, 2, 5, sizes)).toBe(3);
  });

  it('never hides every step icon', () => {
    expect(getVisibleStepCount(40, 2, 5, sizes)).toBe(1);
  });
});
