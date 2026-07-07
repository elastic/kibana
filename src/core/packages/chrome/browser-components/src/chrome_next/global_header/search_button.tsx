/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiBadge, EuiIcon, useEuiBreakpoint, useEuiFontSize, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isMac, useKeyboardShortcut } from '@kbn/shared-ux-utility';
import { useGlobalSearch } from '../../shared/chrome_hooks';
import {
  HEADER_BUTTON_SQUARE_WIDTH_PX,
  headerButtonBaseStyles,
  headerButtonBorderedStyles,
  useHeaderButtonStyleVars,
} from './header_action_button';

const PLACEHOLDER = i18n.translate('core.ui.chrome.globalHeader.searchButton.placeholder', {
  defaultMessage: 'Find content...',
});

const ARIA_LABEL = i18n.translate('core.ui.chrome.globalHeader.searchButton.ariaLabel', {
  defaultMessage: 'Search',
});

const MODIFIER_KEY = isMac ? '⌘' : 'Ctrl';

const SHORTCUT = { key: '/', meta: true };

export const SearchButton = React.memo(() => {
  const config = useGlobalSearch();
  const { euiTheme } = useEuiTheme();
  const euiFontSizeS = useEuiFontSize('s').fontSize;
  const baseStyleVars = useHeaderButtonStyleVars();
  const compactQuery = useEuiBreakpoint(['xs', 's']);

  const shortcutBadgeStyles = css({
    color: euiTheme.colors.textSubdued,
  });

  const placeholderStyles = css({
    color: euiTheme.colors.textDisabled,
    fontSize: euiFontSizeS,
    userSelect: 'none',
  });

  const compactButtonStyles = css({
    [compactQuery]: {
      width: HEADER_BUTTON_SQUARE_WIDTH_PX,
      padding: 0,
      justifyContent: 'center',
      gap: 0,
    },
  });

  const collapsibleStyles = css({
    [compactQuery]: {
      display: 'none',
    },
  });

  const searchOverrides = css({
    padding: `0 ${euiTheme.size.s}`,
    gap: euiTheme.size.s,
    whiteSpace: 'nowrap',
  });

  const shortcutLabel = `${MODIFIER_KEY} ${SHORTCUT.key}`;

  useKeyboardShortcut(SHORTCUT, config?.onClick);

  if (!config) return null;

  return (
    <button
      type="button"
      aria-label={ARIA_LABEL}
      data-test-subj="chromeNextGlobalHeaderSearchButton"
      css={[
        headerButtonBaseStyles,
        headerButtonBorderedStyles,
        searchOverrides,
        compactButtonStyles,
      ]}
      style={baseStyleVars}
      onClick={config.onClick}
    >
      <EuiIcon type="search" size="m" color={euiTheme.colors.textParagraph} aria-hidden />
      <span css={[placeholderStyles, collapsibleStyles]}>{PLACEHOLDER}</span>
      <EuiBadge css={[shortcutBadgeStyles, collapsibleStyles]}>{shortcutLabel}</EuiBadge>
    </button>
  );
});

SearchButton.displayName = 'SearchButton';
