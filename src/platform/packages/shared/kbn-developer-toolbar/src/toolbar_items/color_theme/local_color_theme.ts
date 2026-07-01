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
// eslint-disable-next-line @elastic/eui/no-restricted-eui-imports
import { _setDarkMode } from '@kbn/ui-theme';

export interface LocalColorThemeController {
  /** Emits the currently applied dark-mode state. */
  isDark$: BehaviorSubject<boolean>;
  /** Flip between dark and light, applying the choice live. */
  toggle: () => void;
}

/**
 * A fully client-side color theme override for the developer toolbar.
 *
 * This intentionally does NOT touch the server (nothing is written to the user
 * profile or uiSettings) and does NOT persist across reloads: the override is
 * session-only, so refreshing the page always falls back to the real, server
 * resolved theme. While active, the theme is applied live by hijacking the
 * shared core theme contract (`core.theme`) so every `KibanaEuiProvider`
 * re-themes without a page reload.
 *
 * Known limitation — this is a *partial* live preview:
 *
 * The override works by swapping `core.theme.theme$` for a live subject, so it
 * only reaches consumers that read `theme$` (directly or via `KibanaEuiProvider`
 * / `useKibanaIsDarkMode`) *at or after* the toggle is installed. Subsystems
 * that snapshot the original `theme$` earlier — most notably elastic-charts,
 * whose charts plugin theme service captures and subscribes to `theme$` once
 * during its own `setup()` (see `charts/public/services/theme/theme.ts`) — hold
 * the original static observable and never see our updates, so charts keep
 * rendering the real theme. Anything reading dark mode from a different source
 * entirely is likewise unaffected.
 *
 * Fully covering these would require guaranteed plugin setup ordering
 * or core-level dynamic theme-switching support.
 * A hard refresh always reflects the real, server-resolved theme everywhere.
 */
export const installLocalColorThemeOverride = (
  theme: ThemeServiceStart
): LocalColorThemeController => {
  const baseTheme = theme.getTheme();

  const isDark$ = new BehaviorSubject<boolean>(baseTheme.darkMode);
  const theme$ = new BehaviorSubject<CoreTheme>(baseTheme);

  const apply = (darkMode: boolean): void => {
    // Flip the `euiThemeVars`/`euiDarkVars` proxy (read at access time) so
    // components that read those static vars directly also reflect the preview.
    _setDarkMode(darkMode);
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

  const toggle = (): void => {
    const next = !isDark$.getValue();
    isDark$.next(next);
    apply(next);
  };

  return { isDark$, toggle };
};
