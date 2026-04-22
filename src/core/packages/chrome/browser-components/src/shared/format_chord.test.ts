/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { formatChord } from './format_chord';

describe('formatChord', () => {
  it('renders Mod+/ with mac symbols on mac', () => {
    expect(formatChord('Mod+/', { platform: 'mac' })).toBe('⌘ /');
  });

  it('renders Mod+/ as Ctrl+/ on windows', () => {
    expect(formatChord('Mod+/', { platform: 'windows' })).toBe('Ctrl+/');
  });

  it('renders Mod+/ as Ctrl+/ on linux', () => {
    expect(formatChord('Mod+/', { platform: 'linux' })).toBe('Ctrl+/');
  });

  it('renders Shift+? with symbols on mac', () => {
    expect(formatChord('Shift+?', { platform: 'mac' })).toBe('⇧ ?');
  });
});
