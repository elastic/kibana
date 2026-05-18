/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-bitwise -- Monaco keybindings use VS Code-style modifier masks */

import { OperatingSystem, monaco } from '@kbn/monaco';
import { mapHotkeyChordToMonacoKeybinding, mapMonacoKeybindingToHotkeyChord } from './utils';

const { CtrlCmd, Shift, Alt, WinCtrl } = monaco.KeyMod;
const { Enter, KeyI, KeyK, KeyL, KeyP, KeyZ, Slash, Comma, F1, LeftArrow, RightArrow } =
  monaco.KeyCode;

describe('mapMonacoKeybindingToHotkeyChord', () => {
  it('maps Ctrl/Cmd primary shortcuts using Mod (both OSes)', () => {
    const modEnter = CtrlCmd | Enter;
    expect(
      mapMonacoKeybindingToHotkeyChord(modEnter, { operatingSystem: OperatingSystem.Windows })
    ).toBe('Mod+Enter');
    expect(
      mapMonacoKeybindingToHotkeyChord(modEnter, { operatingSystem: OperatingSystem.Macintosh })
    ).toBe('Mod+Enter');
  });

  it('maps slash with Mod', () => {
    expect(mapMonacoKeybindingToHotkeyChord(CtrlCmd | Slash)).toBe('Mod+/');
  });

  it('includes Shift when present', () => {
    expect(mapMonacoKeybindingToHotkeyChord(CtrlCmd | Shift | KeyZ)).toBe('Mod+Shift+Z');
  });

  it('translates VS Code arrow labels into TanStack-style aliases', () => {
    expect(mapMonacoKeybindingToHotkeyChord(LeftArrow)).toBe('ArrowLeft');
    expect(mapMonacoKeybindingToHotkeyChord(Alt | RightArrow)).toBe('Alt+ArrowRight');
  });
});

describe('mapHotkeyChordToMonacoKeybinding round-trip', () => {
  const cases: Array<{
    label: string;
    keybinding: number;
    operatingSystem?: OperatingSystem;
  }> = [
    {
      label: 'Mod+Enter (Linux)',
      keybinding: CtrlCmd | Enter,
      operatingSystem: OperatingSystem.Linux,
    },
    {
      label: 'Mod+Enter (Macintosh)',
      keybinding: CtrlCmd | Enter,
      operatingSystem: OperatingSystem.Macintosh,
    },
    { label: 'Mod+K (Linux)', keybinding: CtrlCmd | KeyK, operatingSystem: OperatingSystem.Linux },
    {
      label: 'Mod+K (Macintosh)',
      keybinding: CtrlCmd | KeyK,
      operatingSystem: OperatingSystem.Macintosh,
    },
    { label: 'Mod+Shift+Z', keybinding: CtrlCmd | Shift | KeyZ },
    { label: 'Mod+/', keybinding: CtrlCmd | Slash },
    { label: 'Alt+, (comma)', keybinding: Alt | Comma },
    { label: 'F1 (no modifier)', keybinding: F1 },
    { label: 'Mod+ArrowLeft', keybinding: CtrlCmd | LeftArrow },
    {
      label: 'WinCtrl+I on Macintosh maps Ctrl modifier',
      keybinding: WinCtrl | KeyI,
      operatingSystem: OperatingSystem.Macintosh,
    },
    {
      label: 'two-chord (Mod+K Mod+I) via monaco.KeyMod.chord',
      keybinding: monaco.KeyMod.chord(CtrlCmd | KeyK, CtrlCmd | KeyI),
    },
    {
      label: 'two-chord (Mod+K Mod+L) via monaco.KeyMod.chord',
      keybinding: monaco.KeyMod.chord(CtrlCmd | KeyK, CtrlCmd | KeyL),
    },
    {
      label: 'two-chord with shift modifier',
      keybinding: monaco.KeyMod.chord(CtrlCmd | KeyK, Shift | KeyP),
    },
  ];

  it.each(cases)('round-trips $label', ({ keybinding, operatingSystem }) => {
    const opts = operatingSystem !== undefined ? { operatingSystem } : undefined;
    const chord = mapMonacoKeybindingToHotkeyChord(keybinding, opts);
    expect(chord).not.toBe('');
    expect(mapHotkeyChordToMonacoKeybinding(chord, opts)).toBe(keybinding >>> 0);
  });

  it('returns undefined for unknown modifier tokens', () => {
    expect(mapHotkeyChordToMonacoKeybinding('Hyper+Q')).toBeUndefined();
  });

  it('returns undefined when input is not a string', () => {
    expect(mapHotkeyChordToMonacoKeybinding(undefined as unknown as string)).toBeUndefined();
  });

  it('returns undefined for empty / oversized chord sequences', () => {
    expect(mapHotkeyChordToMonacoKeybinding('')).toBeUndefined();
    expect(mapHotkeyChordToMonacoKeybinding('Mod+A Mod+B Mod+C')).toBeUndefined();
  });
});

describe('mapMonacoKeybindingToHotkeyChord edge cases', () => {
  it('returns empty string for 0 keybinding', () => {
    expect(mapMonacoKeybindingToHotkeyChord(0)).toBe('');
  });
});
