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
  popoverTestId?: string;
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
  popoverTestId,
  onClose,
}: AppMenuContextMenuProps) => {
  const panels = useMemo(
    () => getPopoverPanels({ items, primaryActionItem, secondaryActionItem, onClose }),
    [items, primaryActionItem, secondaryActionItem, onClose]
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
      anchorPosition={anchorPosition || 'upLeft'}
      panelStyle={{
        width: popoverWidth,
      }}
      panelProps={{
        'data-test-subj': popoverTestId || 'app-menu-popover',
      }}
    >
      <EuiContextMenu initialPanelId={0} panels={panels} />
    </EuiPopover>
  );
};
