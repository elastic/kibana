/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { isValidElement, type ReactNode } from 'react';
import { css } from '@emotion/react';
import { EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useUserMenu } from '../shared/chrome_hooks';

const USER_MENU_ARIA_LABEL = i18n.translate('core.ui.chrome.agentFirstNav.userMenu.ariaLabel', {
  defaultMessage: 'User menu',
});

interface UserMenuButtonProps {
  isOpen: boolean;
  toggleMenu: () => void;
  avatar: ReactNode;
}

const navFooterItemWrapperStyles = css`
  display: flex;
  justify-content: center;
  width: 100%;
`;

const avatarIconStyles = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 0;

  .euiAvatar,
  .euiLoadingSpinner {
    width: 20px;
    height: 20px;
    min-width: 20px;
    min-height: 20px;
  }
`;

const AgentFirstNavUserMenuButton = ({ isOpen, toggleMenu, avatar }: UserMenuButtonProps) => {
  const AvatarIcon = () => <span css={avatarIconStyles}>{avatar}</span>;

  return (
    <div css={navFooterItemWrapperStyles}>
      <EuiButtonIcon
        aria-expanded={isOpen}
        aria-haspopup={true}
        aria-label={USER_MENU_ARIA_LABEL}
        color={isOpen ? 'primary' : 'text'}
        data-menu-item="true"
        data-test-subj="agentFirstNavUserMenuButton"
        display={isOpen ? 'base' : 'empty'}
        iconType={AvatarIcon}
        onClick={toggleMenu}
        size="s"
      />
    </div>
  );
};

export const AgentFirstNavUserMenu = () => {
  const userMenu = useUserMenu();

  if (!userMenu || !isValidElement(userMenu)) {
    return null;
  }

  const securityNavControl = userMenu.props.children;

  const navUserMenu = isValidElement(securityNavControl)
    ? React.cloneElement(securityNavControl, {
        anchorPosition: 'rightUp',
        avatarSize: 's',
        renderButton: (props: UserMenuButtonProps) => <AgentFirstNavUserMenuButton {...props} />,
      } as Record<string, unknown>)
    : securityNavControl;

  return (
    <div
      css={css`
        ${navFooterItemWrapperStyles};

        .euiPopover {
          width: 100%;
        }

        .euiPopover__anchor {
          display: flex;
          justify-content: center;
          width: 100%;
        }
      `}
      data-test-subj="agentFirstNavUserMenu"
    >
      {React.cloneElement(userMenu, { children: navUserMenu })}
    </div>
  );
};
