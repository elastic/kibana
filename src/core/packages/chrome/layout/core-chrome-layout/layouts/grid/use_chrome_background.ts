/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { useEuiTheme } from '@elastic/eui';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import {
  getChromeColorMode,
  resolveChromeColor,
  type ChromeColorMode,
  type ChromeColorSettings,
} from '@kbn/core-user-settings-common';

export interface ChromeBackground {
  /** The resolved chrome background color for the active color mode. */
  background: string;
  /** The color mode the chrome contents should render in to stay readable on `background`. */
  colorMode: ChromeColorMode;
}

/**
 * Resolves the user's custom chrome background (and the color mode that keeps the chrome contents
 * readable on it) from their profile. Returns `undefined` when the user has no custom color, or
 * when `enabled` is false.
 *
 * It follows `getUserProfile$()`, which emits optimistically on save, so changes apply live.
 */
export const useChromeBackground = (
  userProfile: UserProfileService,
  enabled: boolean
): ChromeBackground | undefined => {
  const { colorMode } = useEuiTheme();
  const isDarkMode = colorMode === 'DARK';

  const profile$ = useMemo(() => userProfile.getUserProfile$(), [userProfile]);
  const profile = useObservable(profile$, null) as { userSettings?: ChromeColorSettings } | null;
  const { chromeColor, chromeColorLight, chromeColorDark } = profile?.userSettings ?? {};

  return useMemo(() => {
    if (!enabled) return undefined;
    const background = resolveChromeColor(
      { chromeColor, chromeColorLight, chromeColorDark },
      isDarkMode
    );
    return background ? { background, colorMode: getChromeColorMode(background) } : undefined;
  }, [enabled, chromeColor, chromeColorLight, chromeColorDark, isDarkMode]);
};
