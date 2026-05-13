/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mapMonacoKeybindingToHotkeyChord } from './utils';

describe('mapMonacoKeybindingToHotkeyChord', () => {
  it('maps Ctrl/Cmd primary shortcuts using Mod', () => {
    const modEnter =
      // eslint-disable-next-line no-bitwise
      2048 /* CtrlCmd */ | 3; /* Enter */
    expect(mapMonacoKeybindingToHotkeyChord(modEnter, { operatingSystem: 1 })).toBe('Mod+Enter');
    expect(mapMonacoKeybindingToHotkeyChord(modEnter, { operatingSystem: 2 })).toBe('Mod+Enter');
  });

  it('maps Cmd/Ctrl + letter chords', () => {
    // eslint-disable-next-line no-bitwise
    const modK = 2048 | 41;
    expect(mapMonacoKeybindingToHotkeyChord(modK)).toMatch(/^Mod\+K$/);
  });

  it('maps slash with Mod', () => {
    // eslint-disable-next-line no-bitwise
    const modSlash = 2048 | 90;
    expect(mapMonacoKeybindingToHotkeyChord(modSlash)).toBe('Mod+/');
  });

  it('includes Shift when present', () => {
    // eslint-disable-next-line no-bitwise
    const modShiftZ = 2048 | 1024 | 56;
    expect(mapMonacoKeybindingToHotkeyChord(modShiftZ)).toBe('Mod+Shift+Z');
  });
});
