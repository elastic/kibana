/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, type ReactElement } from 'react';
import { EuiContextMenu, EuiPopover, EuiToolTip } from '@elastic/eui';
import { getPopoverPanels, getTooltip } from '../utils';
import type {
  AppMenuPopoverItem,
  AppMenuPrimaryActionItem,
  AppMenuSecondaryActionItem,
} from '../types';

interface AppMenuContextMenuProps {
  tooltipContent?: string | (() => string | undefined);
  tooltipTitle?: string | (() => string | undefined);
  anchorElement: ReactElement;
  items: AppMenuPopoverItem[];
  isOpen: boolean;
  popoverWidth?: number;
  primaryActionItem?: AppMenuPrimaryActionItem;
  secondaryActionItem?: AppMenuSecondaryActionItem;
  popoverTestId?: string;
  onClose: () => void;
  onCloseOverflowButton?: () => void;
}

export const AppMenuPopover = ({
  items,
  anchorElement,
  tooltipContent,
  tooltipTitle,
  isOpen,
  popoverWidth,
  primaryActionItem,
  secondaryActionItem,
  popoverTestId = 'app-menu-popover',
  onClose,
  onCloseOverflowButton,
}: AppMenuContextMenuProps) => {
  const panels = useMemo(
    () =>
      getPopoverPanels({
        items,
        primaryActionItem,
        secondaryActionItem,
        rootPanelWidth: popoverWidth,
        rootPopoverTestId: popoverTestId,
        onClose,
        onCloseOverflowButton,
      }),
    [
      items,
      primaryActionItem,
      secondaryActionItem,
      popoverWidth,
      popoverTestId,
      onClose,
      onCloseOverflowButton,
    ]
  );

  if (panels.length === 0) {
    return null;
  }

  const { content, title } = getTooltip({ tooltipContent, tooltipTitle });
  const showTooltip = Boolean(content || title);

  const button = showTooltip ? (
    <EuiToolTip delay="long" content={content} title={title}>
      {anchorElement}
    </EuiToolTip>
  ) : (
    anchorElement
  );

  return (
    <EuiPopover
      button={button}
      isOpen={isOpen}
      closePopover={onClose}
      panelPaddingSize="none"
      hasArrow={false}
      anchorPosition="downLeft"
    >
      <EuiContextMenu initialPanelId={0} panels={panels} />
    </EuiPopover>
  );
};
