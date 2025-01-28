/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getColorMode } from './color_mode';

describe('getColorMode', () => {
  it('returns the correct `colorMode` when `darkMode` is enabled', () => {
    expect(getColorMode({ name: 'amsterdam', darkMode: true })).toEqual('DARK');
  });

  it('returns the correct `colorMode` when `darkMode` is disabled', () => {
    expect(getColorMode({ name: 'amsterdam', darkMode: false })).toEqual('LIGHT');
  });
});
