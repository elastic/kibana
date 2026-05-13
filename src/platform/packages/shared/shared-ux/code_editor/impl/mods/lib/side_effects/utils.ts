/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-bitwise -- Monaco keybindings use VS Code-style modifier masks */

/** Mirrors {@link monaco.KeyMod} bitmask layout from Monaco / VS Code keybindings. */
const MASK_CTRL_CMD = 2048;
const MASK_SHIFT = 1024;
const MASK_ALT = 512;
const MASK_WIN_CTRL = 256;
const MASK_KEY_CODE = 255;

const MAC_OS = 2;

/**
 * Maps Monaco {@link monaco.KeyCode} numeric values to `@tanstack/hotkeys`-style key tokens.
 * @internal
 */
export const MONACO_KEY_CODE_TO_CHORD_TOKEN: Readonly<Record<number, string>> = {
  1: 'Backspace',
  2: 'Tab',
  3: 'Enter',
  4: 'Shift',
  5: 'Ctrl',
  6: 'Alt',
  8: 'CapsLock',
  9: 'Escape',
  10: 'Space',
  11: 'PageUp',
  12: 'PageDown',
  13: 'End',
  14: 'Home',
  15: 'ArrowLeft',
  16: 'ArrowUp',
  17: 'ArrowRight',
  18: 'ArrowDown',
  19: 'Insert',
  20: 'Delete',
  21: '0',
  22: '1',
  23: '2',
  24: '3',
  25: '4',
  26: '5',
  27: '6',
  28: '7',
  29: '8',
  30: '9',
  31: 'A',
  32: 'B',
  33: 'C',
  34: 'D',
  35: 'E',
  36: 'F',
  37: 'G',
  38: 'H',
  39: 'I',
  40: 'J',
  41: 'K',
  42: 'L',
  43: 'M',
  44: 'N',
  45: 'O',
  46: 'P',
  47: 'Q',
  48: 'R',
  49: 'S',
  50: 'T',
  51: 'U',
  52: 'V',
  53: 'W',
  54: 'X',
  55: 'Y',
  56: 'Z',
  57: 'Meta',
  59: 'F1',
  60: 'F2',
  61: 'F3',
  62: 'F4',
  63: 'F5',
  64: 'F6',
  65: 'F7',
  66: 'F8',
  67: 'F9',
  68: 'F10',
  69: 'F11',
  70: 'F12',
  85: ';',
  86: '=',
  87: ',',
  88: '-',
  89: '.',
  90: '/',
  91: '`',
  92: '[',
  93: '\\',
  94: ']',
  95: "'",
};

const detectOperatingSystem = (): number => {
  if (typeof navigator === 'undefined') {
    return 1;
  }
  const ua = navigator.userAgent;
  if (/Macintosh|Mac OS X/i.test(ua)) {
    return MAC_OS;
  }
  if (/Linux/i.test(ua)) {
    return 3;
  }
  return 1;
};

const mapSimpleChord = (
  keybinding: number,
  options?: { readonly operatingSystem?: number }
): string => {
  const OS = options?.operatingSystem ?? detectOperatingSystem();

  const ctrlCmd = (keybinding & MASK_CTRL_CMD) !== 0;
  const winCtrl = (keybinding & MASK_WIN_CTRL) !== 0;
  const shift = (keybinding & MASK_SHIFT) !== 0;
  const alt = (keybinding & MASK_ALT) !== 0;
  const keyCode = keybinding & MASK_KEY_CODE;

  const parts: string[] = [];

  if (ctrlCmd) {
    parts.push('Mod');
  }
  if (OS === MAC_OS) {
    if (winCtrl) {
      parts.push('Ctrl');
    }
  } else if (winCtrl) {
    parts.push('Meta');
  }

  if (alt) {
    parts.push('Alt');
  }
  if (shift) {
    parts.push('Shift');
  }

  const keyToken = MONACO_KEY_CODE_TO_CHORD_TOKEN[keyCode];
  parts.push(keyToken ?? `KeyCode(${keyCode})`);

  return parts.join('+');
};

/**
 * Converts a Monaco numeric keybinding (single chord or {@link monaco.KeyMod.chord} sequence)
 * into a `@tanstack/hotkeys`-style chord string (e.g. `Mod+Enter`). Intended for discovery-only
 * hotkey rows where Monaco remains the executor.
 *
 * @public
 */
export const mapMonacoKeybindingToHotkeyChord = (
  keybinding: number,
  options?: { readonly operatingSystem?: number }
): string => {
  if (keybinding === 0) {
    return '';
  }

  const firstChord = (keybinding & 0x0000ffff) >>> 0;
  const secondChord = (keybinding & 0xffff0000) >>> 16;

  if (secondChord !== 0) {
    return `${mapSimpleChord(firstChord, options)} ${mapSimpleChord(secondChord, options)}`;
  }

  return mapSimpleChord(firstChord, options);
};
