/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import useObservable from 'react-use/lib/useObservable';
import type { InternalThemeServiceStart } from '@kbn/core-theme-browser-internal-types';

interface Props {
  isDarkMode: boolean;
  onToggle: () => void;
}

const ColorThemeToggle = ({ isDarkMode, onToggle }: Props) => (
  <EuiToolTip content="Click to toggle color theme.">
    <EuiBadge
      color={isDarkMode ? '#1E293B' : '#FEF3C7'}
      iconType={isDarkMode ? 'moon' : 'sun'}
      iconSide="left"
      onClick={onToggle}
      onClickAriaLabel="Toggle color theme"
    >
      {isDarkMode ? 'Dark' : 'Light'}
    </EuiBadge>
  </EuiToolTip>
);

/**
 * Toolbar item that reflects and toggles the color theme. It subscribes to the
 * core theme contract so the badge updates live when the theme flips, and calls
 * the dev-only `setDarkMode` to switch without a page reload. The change is
 * session-only: a reload restores the server-resolved theme.
 */
export const LiveColorThemeToggle = ({ theme }: { theme: InternalThemeServiceStart }) => {
  const currentTheme = useObservable(theme.theme$, theme.getTheme());
  const isDarkMode = currentTheme.darkMode;
  return (
    <ColorThemeToggle isDarkMode={isDarkMode} onToggle={() => theme.setDarkMode(!isDarkMode)} />
  );
};
