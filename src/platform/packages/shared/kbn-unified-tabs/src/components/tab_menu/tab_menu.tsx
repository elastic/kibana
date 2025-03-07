/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiHorizontalRule,
  EuiPopover,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { TabItem, GetTabMenuItems } from '../../types';

export interface TabMenuProps {
  item: TabItem;
  getTabMenuItems: GetTabMenuItems;
}

export const TabMenu: React.FC<TabMenuProps> = ({ item, getTabMenuItems }) => {
  const [isPopoverOpen, setPopover] = useState<boolean>(false);
  const contextMenuPopoverId = useGeneratedHtmlId();

  const menuButtonLabel = i18n.translate('unifiedTabs.tabMenuButton', {
    defaultMessage: 'Actions',
  });

  const closePopover = useCallback(() => {
    setPopover(false);
  }, [setPopover]);

  const panelItems = useMemo(() => {
    const itemConfigs = getTabMenuItems(item);

    return itemConfigs.map((itemConfig, index) => {
      if (itemConfig === 'divider') {
        return <EuiHorizontalRule key={`${index}-divider`} margin="none" />;
      }

      return (
        <EuiContextMenuItem
          key={`${index}-${itemConfig.name}`}
          data-test-subj={itemConfig['data-test-subj']}
          onClick={() => {
            itemConfig.onClick();
            closePopover();
          }}
        >
          {itemConfig.label}
        </EuiContextMenuItem>
      );
    });
  }, [item, getTabMenuItems, closePopover]);

  return (
    <EuiPopover
      id={contextMenuPopoverId}
      isOpen={isPopoverOpen}
      panelPaddingSize="none"
      closePopover={closePopover}
      button={
        <EuiButtonIcon
          aria-label={menuButtonLabel}
          title={menuButtonLabel}
          color="text"
          data-test-subj={`unifiedTabs_tabMenuBtn_${item.id}`}
          iconType="boxesVertical"
          onClick={() => setPopover((prev) => !prev)}
        />
      }
    >
      <EuiContextMenuPanel items={panelItems} />
    </EuiPopover>
  );
};
