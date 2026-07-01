/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import type { CoreTheme, ThemeServiceStart } from '@kbn/core-theme-browser';

const STORAGE_KEY = 'kbn_developer_toolbar_color_theme_override';

interface StoredOverride {
  /** The forced color mode. */
  mode: 'dark' | 'light';
  /** The server-resolved dark mode at the time the override was set. */
  base: boolean;
}

const readOverride = (): StoredOverride | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      (parsed?.mode === 'dark' || parsed?.mode === 'light') &&
      typeof parsed?.base === 'boolean'
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
};

const writeOverride = (value: StoredOverride | null): void => {
  try {
    if (value === null) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    }
  } catch {
    // Silently ignore storage errors.
  }
};

export interface LocalColorThemeController {
  /** Emits the currently applied dark-mode state. */
  isDark$: BehaviorSubject<boolean>;
  /** Flip between dark and light, applying and persisting the choice locally. */
  toggle: () => void;
}

/**
 * A fully client-side color theme override for the developer toolbar.
 *
 * This intentionally does NOT touch the server: nothing is written to the user
 * profile or uiSettings. The preference lives only in `localStorage` for this
 * browser, and the theme is applied live by hijacking the shared core theme
 * contract (`core.theme`) so every `KibanaEuiProvider` re-themes without a page
 * reload.
 *
 * The override always yields to the real setting: we remember the server-resolved
 * theme at the time the override was set, and if it later changes (i.e. the user
 * updated their actual color theme setting), the local override is discarded.
 */
export const installLocalColorThemeOverride = (
  theme: ThemeServiceStart
): LocalColorThemeController => {
  const baseTheme = theme.getTheme();
  const stored = readOverride();

  // If the real (server-resolved) theme changed since the override was set, the
  // user must have updated their actual setting — drop the stale override.
  const overrideIsValid = stored !== null && stored.base === baseTheme.darkMode;
  if (stored !== null && !overrideIsValid) {
    writeOverride(null);
  }

  const initialDark = overrideIsValid ? stored!.mode === 'dark' : baseTheme.darkMode;

  const isDark$ = new BehaviorSubject<boolean>(initialDark);
  const theme$ = new BehaviorSubject<CoreTheme>({ ...baseTheme, darkMode: initialDark });

  const apply = (darkMode: boolean): void => {
    (globalThis as { __kbnThemeTag__?: string }).__kbnThemeTag__ = `${baseTheme.name}${
      darkMode ? 'dark' : 'light'
    }`;
    theme$.next({ ...baseTheme, darkMode });
  };

  // Replace the shared theme contract so that every React root subscribing to
  // `core.theme.theme$` (each `KibanaEuiProvider`) reacts to our live updates.
  const mutableTheme = theme as { theme$: unknown; getTheme: () => CoreTheme };
  mutableTheme.theme$ = theme$;
  mutableTheme.getTheme = () => theme$.getValue();

  // Apply a stored override immediately on boot (server rendered the base theme).
  if (overrideIsValid && initialDark !== baseTheme.darkMode) {
    apply(initialDark);
  }

  const toggle = (): void => {
    const next = !isDark$.getValue();
    isDark$.next(next);
    if (next === baseTheme.darkMode) {
      // Back to the real theme — no need to keep an override around.
      writeOverride(null);
    } else {
      writeOverride({ mode: next ? 'dark' : 'light', base: baseTheme.darkMode });
    }
    apply(next);
  };

  return { isDark$, toggle };
};
