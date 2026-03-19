/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButtonIcon, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { getIsSelectedColor } from '../utils';
import { AppMenuPopover } from './app_menu_popover';
import type {
  AppMenuItemType,
  AppMenuPrimaryActionItem,
  AppMenuSecondaryActionItem,
} from '../types';

interface AppMenuShowMoreButtonProps {
  items: AppMenuItemType[];
  isPopoverOpen: boolean;
  primaryActionItem?: AppMenuPrimaryActionItem;
  secondaryActionItem?: AppMenuSecondaryActionItem;
  onPopoverToggle: () => void;
  onPopoverClose: () => void;
}

export const AppMenuOverflowButton = ({
  items,
  isPopoverOpen,
  primaryActionItem,
  secondaryActionItem,
  onPopoverToggle,
  onPopoverClose,
}: AppMenuShowMoreButtonProps) => {
  const { euiTheme } = useEuiTheme();

  if (items.length === 0) {
    return null;
  }

  const handleClick = () => {
    onPopoverToggle();
  };

  const buttonCss = css`
    background-color: ${isPopoverOpen
      ? getIsSelectedColor({
          color: 'text',
          euiTheme,
          isFilled: false,
        })
      : undefined};
  `;

  const button = (
    <EuiButtonIcon
      iconType="boxesHorizontal" // TODO: Change to "ellipsis" when it's available in EUI.
      size="xs"
      aria-label={i18n.translate('core.chrome.appMenu.showMoreButtonLabel', {
        defaultMessage: 'More',
      })}
      color="text"
      aria-haspopup="menu"
      onClick={handleClick}
      isSelected={isPopoverOpen}
      css={buttonCss}
      data-test-subj="app-menu-overflow-button"
    />
  );

  return (
    <AppMenuPopover
      items={items}
      anchorElement={button}
      tooltipContent={i18n.translate('core.chrome.appMenu.showMoreButtonTooltip', {
        defaultMessage: 'More',
      })}
      isOpen={isPopoverOpen}
      primaryActionItem={primaryActionItem}
      secondaryActionItem={secondaryActionItem}
      onClose={onPopoverClose}
    />
  );
};
