/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { css } from '@emotion/react';

import { i18n } from '@kbn/i18n';
import { EuiButtonIcon, EuiCollapsibleNav, EuiThemeProvider, useEuiTheme } from '@elastic/eui';

const LOCAL_STORAGE_IS_OPEN_KEY = 'PROJECT_NAVIGATION_OPEN' as const;
const SIZE_OPEN = 248;
const SIZE_CLOSED = 40;

const buttonCSS = css`
  margin-left: -32px;
  margin-top: 12px;
  position: fixed;
  z-index: 1000;
`;

const openAriaLabel = i18n.translate('core.ui.chrome.projectNav.collapsibleNavOpenAriaLabel', {
  defaultMessage: 'Close navigation',
});

const closedAriaLabel = i18n.translate('core.ui.chrome.projectNav.collapsibleNavClosedAriaLabel', {
  defaultMessage: 'Open navigation',
});

export const ProjectNavigation: React.FC = ({ children }) => {
  const { euiTheme, colorMode } = useEuiTheme();

  const [isOpen, setIsOpen] = useLocalStorage(LOCAL_STORAGE_IS_OPEN_KEY, true);

  const toggleOpen = useCallback(() => {
    setIsOpen(!isOpen);
  }, [isOpen, setIsOpen]);

  const collabsibleNavCSS = css`
    border-inline-end-width: 1,
    background: ${euiTheme.colors.darkestShade},
    display: flex,
    flex-direction: row,
  `;

  return (
    <EuiThemeProvider colorMode={colorMode === 'DARK' ? 'LIGHT' : 'DARK'}>
      <EuiCollapsibleNav
        css={collabsibleNavCSS}
        isOpen={true}
        showButtonIfDocked={true}
        onClose={toggleOpen}
        isDocked={true}
        size={isOpen ? SIZE_OPEN : SIZE_CLOSED}
        hideCloseButton={false}
        button={
          <span css={buttonCSS}>
            <EuiButtonIcon
              iconType={isOpen ? 'menuLeft' : 'menuRight'}
              aria-label={isOpen ? openAriaLabel : closedAriaLabel}
              color="text"
              onClick={toggleOpen}
            />
          </span>
        }
      >
        {isOpen && children}
      </EuiCollapsibleNav>
    </EuiThemeProvider>
  );
};
