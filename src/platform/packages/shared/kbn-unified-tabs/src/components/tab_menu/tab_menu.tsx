/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiHorizontalRule,
  EuiPopover,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { GetTabMenuItems, TabItem } from '../../types';
import { TabMenuItemName } from '../../types';

export interface TabMenuProps {
  item: TabItem;
  getTabMenuItems: GetTabMenuItems;
  isPopoverOpen: boolean;
  isSelected: boolean;
  setPopover: (isOpen: boolean) => void;
  onEnterRenaming: () => void;
}

export const TabMenu: React.FC<TabMenuProps> = ({
  item,
  getTabMenuItems,
  isPopoverOpen,
  isSelected,
  setPopover,
  onEnterRenaming,
}) => {
  const contextMenuPopoverId = useGeneratedHtmlId();

  const menuButtonLabel = i18n.translate('unifiedTabs.tabMenuButton', {
    defaultMessage: 'Actions',
  });

  const closePopover = useCallback(() => {
    setPopover(false);
  }, [setPopover]);

  const panelItems = useMemo(() => {
    const itemConfigs = getTabMenuItems(item);

    const menuItems: React.JSX.Element[] = [];

    itemConfigs.forEach((itemConfig, index) => {
      if (itemConfig === 'divider') {
        menuItems.push(<EuiHorizontalRule key={`${index}-divider`} margin="none" />);
        return;
      }

      const onClick =
        itemConfig.name === TabMenuItemName.enterRenamingMode
          ? onEnterRenaming
          : itemConfig.onClick;

      if (!onClick) {
        return;
      }

      menuItems.push(
        <EuiContextMenuItem
          key={`${index}-${itemConfig.name}`}
          data-test-subj={itemConfig['data-test-subj']}
          onClick={() => {
            closePopover();
            setTimeout(onClick, 100); // run it after Eui handles closing the popover so our changes to focus work correctly
          }}
        >
          {itemConfig.label}
        </EuiContextMenuItem>
      );
    });

    return menuItems;
  }, [item, getTabMenuItems, closePopover, onEnterRenaming]);

  return (
    <EuiPopover
      id={contextMenuPopoverId}
      isOpen={isPopoverOpen}
      panelPaddingSize="none"
      hasArrow={false}
      anchorPosition="downLeft"
      closePopover={closePopover}
      button={
        <EuiToolTip content={menuButtonLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            aria-label={menuButtonLabel}
            tabIndex={isSelected ? 0 : -1}
            color="text"
            data-test-subj={`unifiedTabs_tabMenuBtn_${item.id}`}
            iconType="boxesVertical"
            onClick={() => setPopover(!isPopoverOpen)}
          />
        </EuiToolTip>
      }
    >
      <EuiContextMenuPanel items={panelItems} />
    </EuiPopover>
  );
};
