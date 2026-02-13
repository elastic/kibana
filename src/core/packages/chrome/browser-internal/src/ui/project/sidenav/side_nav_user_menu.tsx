/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useMemo } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiIcon,
  EuiPopover,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

const SIDE_NAV_USER_MENU_ID = 'sideNavUserMenu';

/**
 * Dumb user menu for the side nav footer (project mode).
 * Mimics the header profile menu design and content but is non-functional.
 * Renders above the side nav collapse button.
 */
export const SideNavUserMenu: React.FC = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { euiTheme } = useEuiTheme();

  const wrapperStyles = useMemo(
    () => ({
      wrapper: css`
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: ${euiTheme.size.xxl};
      `,
      button: css`
        &.euiButtonIcon:hover {
          transform: none;
        }
      `,
    }),
    [euiTheme]
  );

  const button = (
    <div css={wrapperStyles.wrapper}>
      <EuiButtonIcon
        data-test-subj="sideNavUserMenuButton"
        css={wrapperStyles.button}
        size="s"
        color="text"
        iconType="user"
        aria-controls={SIDE_NAV_USER_MENU_ID}
        aria-expanded={isPopoverOpen}
        aria-haspopup="true"
        aria-label={i18n.translate(
          'core.ui.chrome.sideNavigation.userMenuButtonAriaLabel',
          { defaultMessage: 'Account menu' }
        )}
        onClick={() => setIsPopoverOpen((v) => !v)}
      />
    </div>
  );

  const panels = [
    {
      id: 0,
      title: i18n.translate('core.ui.chrome.sideNavigation.userMenuTitle', {
        defaultMessage: 'User',
      }),
      content: (
        <EuiContextMenuPanel>
          <EuiContextMenuItem
            icon={<EuiIcon type="user" size="m" />}
            size="s"
            data-test-subj="profileLink"
            onClick={(e) => {
              e.preventDefault();
              setIsPopoverOpen(false);
            }}
          >
            <FormattedMessage
              id="core.ui.chrome.sideNavigation.userMenu.editProfile"
              defaultMessage="Edit profile"
            />
          </EuiContextMenuItem>
          <EuiContextMenuItem
            icon={<EuiIcon type="exit" size="m" />}
            size="s"
            data-test-subj="logoutLink"
            onClick={(e) => {
              e.preventDefault();
              setIsPopoverOpen(false);
            }}
          >
            <FormattedMessage
              id="core.ui.chrome.sideNavigation.userMenu.logout"
              defaultMessage="Log out"
            />
          </EuiContextMenuItem>
        </EuiContextMenuPanel>
      ),
    },
  ];

  return (
    <EuiPopover
      id={SIDE_NAV_USER_MENU_ID}
      ownFocus
      button={button}
      isOpen={isPopoverOpen}
      anchorPosition="rightUp"
      repositionOnScroll
      closePopover={() => setIsPopoverOpen(false)}
      panelPaddingSize="none"
      buffer={0}
    >
      <EuiContextMenu
        className="chrNavControl__userMenu"
        initialPanelId={0}
        panels={panels}
        data-test-subj="sideNavUserMenu"
      />
    </EuiPopover>
  );
};
