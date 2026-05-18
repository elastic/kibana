/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-bitwise -- Monaco keybindings use VS Code-style modifier masks */

import type { HotkeyDefinition } from '@kbn/core-hotkeys-browser';
import {
  type KeyCodeChord,
  KeyCodeUtils,
  OS,
  OperatingSystem,
  decodeKeybinding,
  monaco,
} from '@kbn/monaco';
import type { MonacoHotkeyDiscoveryMeta } from './types';

/** Minimal disposable shape used by both Monaco wrappers' discovery-handle bookkeeping. */
export interface UnregisterHandle {
  unregister(): void;
}

/**
 * Tiny ad-hoc disposable set so wrappers can collect discovery handles without leaking
 * the underlying array. Replaces the duplicated `Array<{ unregister }>` + `splice(0).forEach`
 * pattern that existed in both `installDiscoveryAware*` files.
 */
export interface HandleSet {
  add(handle: UnregisterHandle): void;
  drain(): void;
}

export const createHandleSet = (): HandleSet => {
  const handles: UnregisterHandle[] = [];
  return {
    add: (handle) => {
      handles.push(handle);
    },
    drain: () => {
      handles.splice(0).forEach((h) => h.unregister());
    },
  };
};

/**
 * Builds a {@link HotkeyDefinition} for `registerForDiscovery` from a {@link MonacoHotkeyDiscoveryMeta},
 * applying defaults (`scope: 'context'`) and overlaying a per-binding `id` / resolved `keys` chord
 * plus the optional `onEffectiveBindingChange` callback supplied by the wrapper.
 */
export const defFromMeta = (meta: MonacoHotkeyDiscoveryMeta): HotkeyDefinition => ({
  id: meta.id,
  keys: meta.keys,
  label: meta.label,
  description: meta.description,
  scope: meta.scope ?? 'context',
  appId: meta.appId,
  featureId: meta.featureId,
  group: meta.group,
  enabled: true,
});

/**
 * VS Code's `KeyCodeUtils` UI labels (e.g. `LeftArrow`) differ from `@tanstack/hotkeys`
 * labels (`ArrowLeft`). Source-of-truth alias map; the inverse is derived once.
 */
const ARROW_KEY_ALIASES: ReadonlyMap<string, string> = new Map([
  ['LeftArrow', 'ArrowLeft'],
  ['RightArrow', 'ArrowRight'],
  ['UpArrow', 'ArrowUp'],
  ['DownArrow', 'ArrowDown'],
]);

const ARROW_KEY_ALIASES_INVERSE: ReadonlyMap<string, string> = new Map(
  Array.from(ARROW_KEY_ALIASES, ([k, v]) => [v, k] as const)
);

const uiBaseKeyToTanStack = (uiLabel: string): string => ARROW_KEY_ALIASES.get(uiLabel) ?? uiLabel;

const tanStackTokenToUiBaseKey = (token: string): string =>
  ARROW_KEY_ALIASES_INVERSE.get(token) ?? token;

/**
 * Per-OS labels for the {@link KeyCodeChord.ctrlKey} / {@link KeyCodeChord.metaKey} bits.
 * `Mod` always tracks the platform's "primary" modifier (Cmd on macOS, Ctrl elsewhere) so cheat-sheet
 * output stays compatible with `@tanstack/hotkeys`. Mirrors VS Code's `ModifierLabelProvider` shape.
 */
const TANSTACK_LABELS_BY_OS: Readonly<Record<OperatingSystem, { ctrl: string; meta: string }>> = {
  [OperatingSystem.Macintosh]: { ctrl: 'Ctrl', meta: 'Mod' },
  [OperatingSystem.Linux]: { ctrl: 'Mod', meta: 'Meta' },
  [OperatingSystem.Windows]: { ctrl: 'Mod', meta: 'Meta' },
};

/**
 * Converts a decoded VS Code {@link KeyCodeChord} into a TanStack-oriented chord string
 * (`Mod`, `Alt`, `ArrowLeft`, …) matching historical Kibana Monaco discovery output.
 */
export const keyCodeChordToTanStackChord = (
  chord: Pick<KeyCodeChord, 'ctrlKey' | 'shiftKey' | 'altKey' | 'metaKey'> & { keyCode: number },
  operatingSystem: OperatingSystem
): string => {
  const labels = TANSTACK_LABELS_BY_OS[operatingSystem];
  const parts: string[] = [];

  if (chord.metaKey) parts.push(labels.meta);
  if (chord.ctrlKey) parts.push(labels.ctrl);
  if (chord.altKey) parts.push('Alt');
  if (chord.shiftKey) parts.push('Shift');

  parts.push(uiBaseKeyToTanStack(KeyCodeUtils.toString(chord.keyCode)));

  return parts.join('+');
};

interface ParsedTanStackChord {
  readonly ctrlCmd: boolean;
  readonly winCtrl: boolean;
  readonly shift: boolean;
  readonly alt: boolean;
  readonly keyCode: number;
}

const parseTanStackChordTokens = (
  chordSegment: string,
  operatingSystem: OperatingSystem
): ParsedTanStackChord | undefined => {
  const tokens = chordSegment
    .split('+')
    .map((t) => t.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return undefined;
  }

  const baseRaw = tokens[tokens.length - 1]!;
  const modifierTokens = tokens.slice(0, -1).map((t) => t.toLowerCase());
  const isMac = operatingSystem === OperatingSystem.Macintosh;

  let ctrlCmd = false;
  let winCtrl = false;
  let shift = false;
  let alt = false;

  for (const raw of modifierTokens) {
    switch (raw) {
      case 'mod':
        ctrlCmd = true;
        break;
      case 'shift':
        shift = true;
        break;
      case 'alt':
        alt = true;
        break;
      case 'ctrl':
      case 'control':
        if (isMac) winCtrl = true;
        else ctrlCmd = true;
        break;
      case 'meta':
      case 'cmd':
      case 'command':
        if (isMac) ctrlCmd = true;
        else winCtrl = true;
        break;
      default:
        return undefined;
    }
  }

  const baseToken = tanStackTokenToUiBaseKey(baseRaw);
  const keyCode = KeyCodeUtils.fromString(baseToken) || KeyCodeUtils.fromUserSettings(baseToken);

  if (!keyCode) {
    return undefined;
  }

  return { ctrlCmd, winCtrl, shift, alt, keyCode };
};

const encodeChord = (chord: ParsedTanStackChord): number => {
  let kb = chord.keyCode & 0xff;
  if (chord.shift) kb |= monaco.KeyMod.Shift;
  if (chord.alt) kb |= monaco.KeyMod.Alt;
  if (chord.winCtrl) kb |= monaco.KeyMod.WinCtrl;
  if (chord.ctrlCmd) kb |= monaco.KeyMod.CtrlCmd;
  return kb >>> 0;
};

/**
 * Converts a Monaco numeric keybinding (single chord or {@link monaco.KeyMod.chord} sequence)
 * into a `@tanstack/hotkeys`-style chord string (e.g. `Mod+Enter`). Intended for discovery-only
 * hotkey rows where Monaco remains the executor.
 *
 * Uses Monaco-bundled VS Code {@link decodeKeybinding} + {@link KeyCodeUtils}; see
 * https://github.com/microsoft/vscode/blob/main/src/vs/base/common/keyCodes.ts
 *
 * @public
 */
export const mapMonacoKeybindingToHotkeyChord = (
  keybinding: number,
  options?: { readonly operatingSystem?: OperatingSystem }
): string => {
  if (keybinding === 0) {
    return '';
  }

  const operatingSystem = options?.operatingSystem ?? OS;
  const decoded = decodeKeybinding(keybinding, operatingSystem);
  if (!decoded || decoded.chords.length === 0) {
    return '';
  }

  return decoded.chords
    .map((chord) => keyCodeChordToTanStackChord(chord, operatingSystem))
    .join(' ');
};

/**
 * Inverse of {@link mapMonacoKeybindingToHotkeyChord} for rebinding: parses TanStack-style chords
 * (the same shape as discovery rows) back into Monaco's packed keybinding integer.
 *
 * Accepts either the canonical string chord or a structured {@link HotkeyDefinition.keys} value;
 * structured values are JSON-stringified for diagnostics but not parsed back into Monaco bitmasks.
 *
 * @public
 */
export const mapHotkeyChordToMonacoKeybinding = (
  keys: HotkeyDefinition['keys'],
  options?: { readonly operatingSystem?: OperatingSystem }
): number | undefined => {
  if (typeof keys !== 'string') {
    return undefined;
  }

  const chordSegments = keys.trim().split(/\s+/).filter(Boolean);
  if (chordSegments.length === 0 || chordSegments.length > 2) {
    return undefined;
  }

  const operatingSystem = options?.operatingSystem ?? OS;
  const first = parseTanStackChordTokens(chordSegments[0]!, operatingSystem);
  if (!first) {
    return undefined;
  }

  const firstEncoded = encodeChord(first);
  if (chordSegments.length === 1) {
    return firstEncoded;
  }

  const second = parseTanStackChordTokens(chordSegments[1]!, operatingSystem);
  if (!second) {
    return undefined;
  }

  return monaco.KeyMod.chord(firstEncoded, encodeChord(second));
};
