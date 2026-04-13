/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { css } from '@emotion/react';
import { EuiIcon, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { HeaderHelpMenu } from '../../shared/header_help_menu';

const HELP_BUTTON_SIZE = 32;

const helpButtonBase = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
  width: HELP_BUTTON_SIZE,
  height: HELP_BUTTON_SIZE,
  padding: 0,
  background: 'transparent',
  cursor: 'pointer',
  '&:hover': { background: 'var(--help-btn-hover)' },
  '&:focus-visible': {
    outline: '2px solid var(--help-btn-focus)',
    outlineOffset: -2,
  },
});

const HELP_ARIA_LABEL = i18n.translate('core.ui.chrome.headerGlobalNav.helpMenuButtonAriaLabel', {
  defaultMessage: 'Help menu',
});

export const HelpButton = React.memo(() => {
  const { euiTheme } = useEuiTheme();

  const renderButton = useCallback(
    ({ isOpen, toggleMenu }: { isOpen: boolean; toggleMenu: () => void }) => (
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={HELP_ARIA_LABEL}
        data-test-subj="chromeNextGlobalHeaderHelpButton"
        css={[
          helpButtonBase,
          {
            border: `1px solid ${euiTheme.colors.borderBasePlain}`,
            borderRadius: euiTheme.border.radius.medium,
          },
        ]}
        style={
          {
            '--help-btn-hover': euiTheme.colors.backgroundBaseInteractiveHover,
            '--help-btn-focus': euiTheme.colors.primary,
          } as React.CSSProperties
        }
        onClick={toggleMenu}
      >
        <EuiIcon type="question" size="m" aria-hidden />
      </button>
    ),
    [euiTheme]
  );

  return <HeaderHelpMenu renderButton={renderButton} />;
});

HelpButton.displayName = 'HelpButton';
