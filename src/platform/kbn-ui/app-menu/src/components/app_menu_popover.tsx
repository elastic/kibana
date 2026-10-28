/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, type ReactElement } from 'react';
import {
  EuiContextMenu,
  EuiPopover,
  EuiToolTip,
  type EuiContextMenuPanelDescriptor,
  type PopoverAnchorPosition,
} from '@elastic/eui';
import { getPopoverPanels, getSwitchesPanelItems, getTooltip } from '../utils';
import { DEFAULT_POPOVER_WIDTH } from '../constants';
import { APP_MENU_TEST_SUBJECTS } from '../test_subjects';
import type {
  AppMenuItemType,
  AppMenuPopoverItem,
  AppMenuPrimaryActionItem,
  AppMenuSwitch,
} from '../types';

interface AppMenuContextMenuProps {
  tooltipContent?: string | (() => string | undefined);
  tooltipTitle?: string | (() => string | undefined);
  anchorElement: ReactElement;
  anchorDomElement?: HTMLElement;
  items: AppMenuPopoverItem[];
  /**
   * When provided, the popover lists these switches instead of `items`.
   */
  switches?: AppMenuSwitch[];
  staticItems?: AppMenuItemType[];
  isOpen: boolean;
  popoverWidth?: number;
  primaryActionItem?: AppMenuPrimaryActionItem;
  switchConfig?: AppMenuSwitch;
  popoverTestId?: string;
  anchorPosition?: PopoverAnchorPosition;
  repositionToCrossAxis?: boolean;
  onClose: () => void;
  onCloseOverflowButton?: () => void;
}

export const AppMenuPopover = ({
  items,
  switches,
  staticItems,
  anchorElement,
  anchorDomElement,
  tooltipContent,
  tooltipTitle,
  isOpen,
  popoverWidth,
  primaryActionItem,
  switchConfig,
  popoverTestId = APP_MENU_TEST_SUBJECTS.popover,
  anchorPosition = 'downLeft',
  repositionToCrossAxis,
  onClose,
  onCloseOverflowButton,
}: AppMenuContextMenuProps) => {
  const panels = useMemo(
    (): EuiContextMenuPanelDescriptor[] =>
      switches && switches.length > 0
        ? [
            {
              id: 0,
              'data-test-subj': popoverTestId,
              width: popoverWidth ?? DEFAULT_POPOVER_WIDTH,
              items: getSwitchesPanelItems(switches),
            },
          ]
        : getPopoverPanels({
            items,
            staticItems,
            primaryActionItem,
            switchConfig,
            rootPanelWidth: popoverWidth,
            rootPopoverTestId: popoverTestId,
            onClose,
            onCloseOverflowButton,
            anchorDomElement,
          }),
    [
      items,
      switches,
      staticItems,
      primaryActionItem,
      switchConfig,
      popoverWidth,
      popoverTestId,
      onClose,
      onCloseOverflowButton,
      anchorDomElement,
    ]
  );

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
      anchorPosition={anchorPosition}
      aria-label={title || content}
      repositionToCrossAxis={repositionToCrossAxis}
    >
      <EuiContextMenu initialPanelId={0} panels={panels} css={{ minWidth: 180 }} />
    </EuiPopover>
  );
};
