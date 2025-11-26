/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import React, { useState } from 'react';
import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { EuiContextMenu, EuiPopover } from '@elastic/eui';
import { upperFirst } from 'lodash';
import { isDisabled } from './utils';
import type { TopNavMenuItemBetaType } from './types';

interface TopNavContextMenuProps {
  anchorElement: ReactNode | HTMLElement;
  items: TopNavMenuItemBetaType[];
  isOpen?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
}

export const TopNavPopover = ({
  items,
  anchorElement,
  isOpen: externalIsOpen,
  onToggle: externalOnToggle,
  onClose: externalOnClose,
}: TopNavContextMenuProps) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  const isControlled = externalIsOpen !== undefined;
  const isPopoverOpen = isControlled ? externalIsOpen : internalIsOpen;

  const onButtonClick = () => {
    if (isControlled && externalOnToggle) {
      externalOnToggle();
    } else {
      setInternalIsOpen(!internalIsOpen);
    }
  };

  const closePopover = () => {
    if (isControlled && externalOnClose) {
      externalOnClose();
    } else {
      setInternalIsOpen(false);
    }
  };

  const mapTopNavItemToPanelItem = (item: TopNavMenuItemBetaType, childPanelId?: number) => {
    return {
      key: item.id,
      name: upperFirst(item.label),
      icon: item.iconType,
      onClick:
        item?.href || childPanelId !== undefined
          ? undefined
          : () => {
              item.run();
            },
      href: item?.href,
      target: item?.target,
      disabled: isDisabled(item?.disableButton),
      ...(childPanelId !== undefined && { panel: childPanelId }),
    };
  };

  const buildPanelsRecursively = (
    menuItems: TopNavMenuItemBetaType[],
    startPanelId: number = 0
  ): EuiContextMenuPanelDescriptor[] => {
    const panels: EuiContextMenuPanelDescriptor[] = [];
    let currentPanelId = startPanelId;

    const processItems = (
      itemsToProcess: TopNavMenuItemBetaType[],
      panelId: number,
      parentTitle?: string
    ) => {
      const panelItems = itemsToProcess.map((item) => {
        if (item.items && item.items.length > 0) {
          // This item has children, assign it a new panel ID
          currentPanelId++;
          const childPanelId = currentPanelId;

          // Process children recursively
          processItems(item.items, childPanelId, item.label);

          // Return panel item that links to child panel
          return mapTopNavItemToPanelItem(item, childPanelId);
        }

        // No children, return regular panel item
        return mapTopNavItemToPanelItem(item);
      });

      panels.push({
        id: panelId,
        ...(parentTitle && { title: parentTitle }),
        items: panelItems,
      });
    };

    processItems(menuItems, startPanelId);
    return panels;
  };

  const panels = buildPanelsRecursively(items);

  // Only clone button with onClick if not externally controlled
  // (externally controlled means state is managed by parent, e.g., split button secondary click)
  const button =
    isControlled && externalOnToggle
      ? (anchorElement as React.ReactElement)
      : React.cloneElement(anchorElement as React.ReactElement, {
          onClick: onButtonClick,
        });

  return (
    <EuiPopover
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      hasArrow={false}
    >
      <EuiContextMenu initialPanelId={0} panels={panels} />
    </EuiPopover>
  );
};
