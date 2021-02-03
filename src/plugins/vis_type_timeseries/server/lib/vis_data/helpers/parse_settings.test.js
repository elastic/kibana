/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { parseSettings } from './parse_settings';

describe('parseSettings', () => {
  test('returns the true for "true"', () => {
    const settings = 'pad=true';
    expect(parseSettings(settings)).toEqual({
      pad: true,
    });
  });

  test('returns the false for "false"', () => {
    const settings = 'pad=false';
    expect(parseSettings(settings)).toEqual({
      pad: false,
    });
  });

  test('returns the true for 1', () => {
    const settings = 'pad=1';
    expect(parseSettings(settings)).toEqual({
      pad: true,
    });
  });

  test('returns the false for 0', () => {
    const settings = 'pad=0';
    expect(parseSettings(settings)).toEqual({
      pad: false,
    });
  });

  test('returns the settings as an object', () => {
    const settings = 'alpha=0.9 beta=0.4 gamma=0.2 period=5 pad=false type=add';
    expect(parseSettings(settings)).toEqual({
      alpha: 0.9,
      beta: 0.4,
      gamma: 0.2,
      period: 5,
      pad: false,
      type: 'add',
    });
  });
});
