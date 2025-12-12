/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, type ReactElement } from 'react';
import type { PopoverAnchorPosition } from '@elastic/eui';
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
  anchorPosition?: PopoverAnchorPosition;
  testId?: string;
  onClose: () => void;
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
  anchorPosition,
  testId,
  onClose,
}: AppMenuContextMenuProps) => {
  const panels = useMemo(
    () => getPopoverPanels({ items, primaryActionItem, secondaryActionItem }),
    [items, primaryActionItem, secondaryActionItem]
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
      data-test-subj={testId || 'top-nav-menu-popover'}
      button={button}
      isOpen={isOpen}
      closePopover={onClose}
      panelPaddingSize="none"
      hasArrow={false}
      anchorPosition={anchorPosition || 'upLeft'}
      panelStyle={{
        width: popoverWidth,
      }}
    >
      <EuiContextMenu initialPanelId={0} panels={panels} />
    </EuiPopover>
  );
};
