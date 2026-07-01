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
import type { LocalColorThemeController } from './local_color_theme';

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
 * Toolbar item that reflects and toggles the color theme override. It subscribes
 * to the controller so the badge updates live when the theme flips. The
 * controller (which installs the global override) is created eagerly by the
 * plugin; only this presentational component is lazy-loaded.
 */
export const LiveColorThemeToggle = ({ controller }: { controller: LocalColorThemeController }) => {
  const isDarkMode = useObservable(controller.isDark$, controller.isDark$.getValue());
  return <ColorThemeToggle isDarkMode={isDarkMode} onToggle={controller.toggle} />;
};
