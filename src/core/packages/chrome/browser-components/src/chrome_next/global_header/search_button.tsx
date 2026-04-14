/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiIcon, useEuiBreakpoint, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isMac, useKeyboardShortcut } from '@kbn/shared-ux-utility';
import { useGlobalSearch } from '../../shared/chrome_hooks';
import {
  headerButtonBaseStyles,
  headerButtonBorderedStyles,
  useHeaderButtonStyleVars,
} from './header_action_button';

const searchOverrides = css({
  padding: '0 8px',
  gap: 6,
  whiteSpace: 'nowrap',
});

const placeholderStyles = css({
  color: 'var(--search-btn-placeholder)',
  fontSize: 13,
  lineHeight: 1,
  userSelect: 'none',
});

const kbdStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 2,
  padding: '2px 5px',
  fontSize: 11,
  lineHeight: 1,
  fontFamily: 'inherit',
  color: 'var(--search-btn-placeholder)',
  background: 'var(--search-btn-kbd-bg)',
  border: 'none',
  borderRadius: 3,
  userSelect: 'none',
});

const PLACEHOLDER = i18n.translate('core.ui.chrome.globalHeader.searchButton.placeholder', {
  defaultMessage: 'Find content...',
});

const ARIA_LABEL = i18n.translate('core.ui.chrome.globalHeader.searchButton.ariaLabel', {
  defaultMessage: 'Search',
});

const MODIFIER_KEY = isMac ? '⌘' : 'Ctrl';

export const SearchButton = React.memo(() => {
  const config = useGlobalSearch();
  const { euiTheme } = useEuiTheme();
  const baseStyleVars = useHeaderButtonStyleVars();
  const compactQuery = useEuiBreakpoint(['xs', 's']);

  const compactButton = css({
    [compactQuery]: {
      width: 32,
      padding: 0,
      justifyContent: 'center',
      gap: 0,
    },
  });

  const collapsible = css({
    [compactQuery]: {
      display: 'none',
    },
  });

  const shortcut = useMemo(
    () => (config?.shortcutKey ? { key: config.shortcutKey, meta: true } : undefined),
    [config?.shortcutKey]
  );
  useKeyboardShortcut(shortcut, config?.onClick);

  if (!config) return null;

  const shortcutLabel = config.shortcutKey
    ? `${MODIFIER_KEY} ${config.shortcutKey.toUpperCase()}`
    : undefined;

  return (
    <button
      type="button"
      aria-label={ARIA_LABEL}
      data-test-subj="chromeNextGlobalHeaderSearchButton"
      css={[headerButtonBaseStyles, headerButtonBorderedStyles, searchOverrides, compactButton]}
      style={
        {
          ...baseStyleVars,
          '--search-btn-placeholder': euiTheme.colors.textSubdued,
          '--search-btn-kbd-bg': euiTheme.colors.backgroundBaseSubdued,
        } as React.CSSProperties
      }
      onClick={config.onClick}
    >
      <EuiIcon type="search" size="m" color="subdued" aria-hidden />
      <span css={[placeholderStyles, collapsible]}>{PLACEHOLDER}</span>
      {shortcutLabel && <kbd css={[kbdStyles, collapsible]}>{shortcutLabel}</kbd>}
    </button>
  );
});

SearchButton.displayName = 'SearchButton';
