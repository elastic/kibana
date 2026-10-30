/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useRef, type ReactElement } from 'react';
import {
  EuiContextMenu,
  EuiPopover,
  EuiToolTip,
  type EuiContextMenuPanelDescriptor,
} from '@elastic/eui';
import { getPopoverPanels, getTooltip } from '../utils';
import type { AppMenuPopoverItem, AppMenuPrimaryActionItem } from '../types';

interface AppMenuContextMenuProps {
  tooltipContent?: string | (() => string | undefined);
  tooltipTitle?: string | (() => string | undefined);
  anchorElement: ReactElement;
  items: AppMenuPopoverItem[];
  isOpen: boolean;
  popoverWidth?: number;
  primaryActionItem?: AppMenuPrimaryActionItem;
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
  popoverTestId = 'app-menu-popover',
  onClose,
  onCloseOverflowButton,
}: AppMenuContextMenuProps) => {
  const lastPanels = useRef<EuiContextMenuPanelDescriptor[]>();
  const panels = useMemo(() => {
    // keep the last panels while closed: EuiPopover still renders them during its exit transition.
    if (!isOpen) {
      return lastPanels.current ?? [];
    }

    // building panels on every open re-evaluate `disableButton`, tooltip values, etc. */
    const nextPanels = getPopoverPanels({
      items,
      primaryActionItem,
      rootPanelWidth: popoverWidth,
      rootPopoverTestId: popoverTestId,
      onClose,
      onCloseOverflowButton,
    });
    lastPanels.current = nextPanels;
    return nextPanels;
  }, [
    isOpen,
    items,
    primaryActionItem,
    popoverWidth,
    popoverTestId,
    onClose,
    onCloseOverflowButton,
  ]);

  if (panels.length === 0) {
    return null;
  }

  const { content, title } = getTooltip({ tooltipContent, tooltipTitle });
  const showTooltip = Boolean(content || title);

  const button = showTooltip ? (
    <EuiToolTip content={content} title={title}>
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
      aria-label={title || content}
    >
      <EuiContextMenu initialPanelId={0} panels={panels} />
    </EuiPopover>
  );
};
