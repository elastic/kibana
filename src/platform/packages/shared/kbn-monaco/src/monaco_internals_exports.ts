/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @kbn/eslint/module_migration */
// Re-export Monaco-bundled VS Code keybinding helpers (deep ESM paths, ambient types in
// typings.d.ts). We import the runtime values and re-export with strong types so consumers
// don't have to redeclare the shapes locally.
// (File-wide `eslint-disable @kbn/eslint/module_migration` at the top of this file covers these.)
import { decodeKeybinding as _decodeKeybinding } from 'monaco-editor/esm/vs/base/common/keybindings.js';
import { KeyCodeUtils as _KeyCodeUtils } from 'monaco-editor/esm/vs/base/common/keyCodes.js';
import { OS as _OS } from 'monaco-editor/esm/vs/base/common/platform.js';
import { ContextKeyExpr as _ContextKeyExpr } from 'monaco-editor/esm/vs/platform/contextkey/common/contextkey.js';

/**
 * Mirrors VS Code's `KeyCodeChord` shape. Returned by {@link decodeKeybinding} chords.
 * See [`keybindings.ts`](https://github.com/microsoft/vscode/blob/main/src/vs/base/common/keybindings.ts).
 */
export interface KeyCodeChord {
  readonly ctrlKey: boolean;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
  readonly metaKey: boolean;
  readonly keyCode: number;
}

export interface Keybinding {
  readonly chords: readonly KeyCodeChord[];
}

export const decodeKeybinding: (keybinding: number, OS: number) => Keybinding | null =
  _decodeKeybinding;

export const KeyCodeUtils: {
  toString(keyCode: number): string;
  fromString(key: string): number;
  fromUserSettings(key: string): number;
} = _KeyCodeUtils;

/**
 * Numeric values mirror VS Code's `OperatingSystem` const enum (which is inlined upstream
 * and thus not directly importable). Matches what {@link OS} and {@link decodeKeybinding}
 * accept/return.
 */
export const OperatingSystem = {
  Windows: 1,
  Macintosh: 2,
  Linux: 3,
} as const;
export type OperatingSystem = (typeof OperatingSystem)[keyof typeof OperatingSystem];

/** Current platform's {@link OperatingSystem} value, as resolved by Monaco. */
export const OS: OperatingSystem = _OS as OperatingSystem;

/**
 * Minimal subset of VS Code's `ContextKeyExpr` exposed by Monaco. Currently only `deserialize`
 * is used by Kibana code editor wrappers when forwarding `editor.addCommand`'s `when` context.
 */
export const ContextKeyExpr: {
  deserialize(serialized: string | undefined): unknown;
} = _ContextKeyExpr;
