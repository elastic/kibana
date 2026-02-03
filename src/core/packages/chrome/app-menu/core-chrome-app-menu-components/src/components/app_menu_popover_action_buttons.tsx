/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { AppMenuActionButton } from './app_menu_action_button';
import type { AppMenuPrimaryActionItem, AppMenuSecondaryActionItem } from '../types';

interface AppMenuPopoverActionButtonsProps {
  primaryActionItem?: AppMenuPrimaryActionItem;
  secondaryActionItem?: AppMenuSecondaryActionItem;
  onCloseOverflowButton?: () => void;
}

export const AppMenuPopoverActionButtons = ({
  primaryActionItem,
  secondaryActionItem,
  onCloseOverflowButton,
}: AppMenuPopoverActionButtonsProps) => {
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  const { euiTheme } = useEuiTheme();

  if (!primaryActionItem && !secondaryActionItem) {
    return null;
  }

  const handlePopoverToggle = (id: string) => {
    setOpenPopoverId(openPopoverId === id ? null : id);
  };

  const handleOnPopoverClose = () => {
    setOpenPopoverId(null);
  };

  const containerCss = css`
    margin-top: ${euiTheme.size.m};
    margin-bottom: ${euiTheme.size.m};
  `;

  return (
    <EuiFlexGroup
      direction="column"
      justifyContent="center"
      gutterSize="m"
      alignItems="center"
      css={containerCss}
      data-test-subj="app-menu-popover-action-buttons-container"
    >
      {secondaryActionItem && (
        <EuiFlexItem grow={false}>
          <AppMenuActionButton
            {...secondaryActionItem}
            run={(params) => {
              secondaryActionItem?.run?.(params);
              onCloseOverflowButton?.();
            }}
            isPopoverOpen={openPopoverId === secondaryActionItem.id}
            onPopoverToggle={() => {
              handlePopoverToggle(secondaryActionItem.id);
            }}
            onPopoverClose={handleOnPopoverClose}
            onCloseOverflowButton={onCloseOverflowButton}
            popoverAnchorPosition="downLeft"
          />
        </EuiFlexItem>
      )}
      {primaryActionItem && (
        <EuiFlexItem grow={false}>
          <AppMenuActionButton
            {...primaryActionItem}
            run={(params) => {
              primaryActionItem?.run?.(params);
              onCloseOverflowButton?.();
            }}
            isPopoverOpen={openPopoverId === primaryActionItem.id}
            onPopoverToggle={() => {
              handlePopoverToggle(primaryActionItem.id);
            }}
            onPopoverClose={handleOnPopoverClose}
            onCloseOverflowButton={onCloseOverflowButton}
            popoverAnchorPosition="downLeft"
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
