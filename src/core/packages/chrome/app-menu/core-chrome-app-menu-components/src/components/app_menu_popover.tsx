/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useState, type ReactElement } from 'react';
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
  anchorPosition,
  popoverTestId,
  onClose,
  onCloseOverflowButton,
}: AppMenuContextMenuProps) => {
  const [activePanelId, setActivePanelId] = useState<string>('0');

  const { panels, panelIdToTestId } = useMemo(
    () =>
      getPopoverPanels({
        items,
        primaryActionItem,
        secondaryActionItem,
        onClose,
        onCloseOverflowButton,
      }),
    [items, primaryActionItem, secondaryActionItem, onClose, onCloseOverflowButton]
  );

  if (panels.length === 0) {
    return null;
  }

  /**
   * Determine the active test ID for the popover panel.
   * EuiContextMenuPanelItemDescriptor does not support data-test-subj directly,
   * so we map panel IDs to test IDs when creating the panels.
   * TODO: Remove this implementation if EUI fix is provided: https://github.com/elastic/eui/issues/9321
   */
  const activeTestId = panelIdToTestId[activePanelId] || popoverTestId || 'app-menu-popover';

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
        'data-test-subj': activeTestId,
      }}
    >
      <EuiContextMenu
        initialPanelId={0}
        panels={panels}
        onPanelChange={({ panelId }) => setActivePanelId(String(panelId))}
      />
    </EuiPopover>
  );
};
