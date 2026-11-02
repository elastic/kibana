/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';
import { isMac } from './platform';

export interface KeyboardShortcut {
  key: string;
  /** Cmd on Mac, Ctrl on other platforms. */
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  /** Literal Ctrl on all platforms (distinct from meta on Mac). */
  ctrl?: boolean;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return true;
  return target.isContentEditable;
}

export function useKeyboardShortcut(
  shortcut: KeyboardShortcut | undefined,
  callback: (() => void) | undefined
) {
  useEffect(() => {
    if (!shortcut || !callback) return;

    const target = shortcut.key.toLowerCase();
    const wantMeta = shortcut.meta ?? false;
    const wantShift = shortcut.shift ?? false;
    const wantAlt = shortcut.alt ?? false;
    const wantCtrl = shortcut.ctrl ?? false;

    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== target) return;
      if (isEditableTarget(e.target)) return;

      if (wantShift !== e.shiftKey) return;
      if (wantAlt !== e.altKey) return;

      if (isMac) {
        if (wantMeta !== e.metaKey) return;
        if (wantCtrl !== e.ctrlKey) return;
      } else {
        // On non-Mac, meta and ctrl both map to the physical Ctrl key.
        // They cannot be distinguished, so either flag claims e.ctrlKey.
        const wantEither = wantMeta || wantCtrl;
        if (wantEither !== e.ctrlKey) return;
        if (e.metaKey) return;
      }

      e.preventDefault();
      callback();
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [shortcut, callback]);
}
