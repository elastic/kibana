/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IconType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { TabItem, GetTabMenuItems, TabMenuItemWithClick, TabMenuItem } from '../types';
import { TabMenuItemName } from '../types';
import { isLastTab, hasSingleTab, type TabsState } from './manage_tabs';

const DividerMenuItem = 'divider';

interface TabMenuItemProps {
  name: string;
  label: string;
  item: TabItem;
  onClick: ((item: TabItem) => void) | null; // `null` can be overridden inside tab menu
  icon?: IconType;
}

const getTabMenuItem = ({
  name,
  label,
  item,
  onClick,
  icon,
}: TabMenuItemProps): TabMenuItemWithClick => ({
  'data-test-subj': `unifiedTabs_tabMenuItem_${name}`,
  name,
  label,
  onClick: onClick ? () => onClick(item) : null,
  ...(icon ? { icon } : {}),
});

export interface GetTabMenuItemsFnProps {
  tabsState: TabsState;
  maxItemsCount: number | undefined;
  onDuplicate: (item: TabItem) => void;
  onCloseOtherTabs: (item: TabItem) => void;
  onCloseTabsToTheRight: (item: TabItem) => void;
  /** Hides the "Close other tabs" and "Close tabs to the right" menu items */
  disableCloseTabsMenuItems?: boolean;
  /** Shows icons on the core tab menu items */
  showTabMenuItemIcons?: boolean;
  /** Optional function to provide menu items placed after the core tab menu items */
  getTopTabMenuItems?: (item: TabItem) => TabMenuItem[];
  /** Optional function to provide additional menu items placed at the end of the menu */
  getAdditionalTabMenuItems?: (item: TabItem) => TabMenuItem[];
}

export const getTabMenuItemsFn = ({
  tabsState,
  maxItemsCount,
  onDuplicate,
  onCloseOtherTabs,
  onCloseTabsToTheRight,
  disableCloseTabsMenuItems = false,
  showTabMenuItemIcons = false,
  getTopTabMenuItems,
  getAdditionalTabMenuItems,
}: GetTabMenuItemsFnProps): GetTabMenuItems => {
  const iconFor = (icon: IconType) => (showTabMenuItemIcons ? icon : undefined);
  return (item) => {
    const closeOtherTabsItem =
      disableCloseTabsMenuItems || hasSingleTab(tabsState)
        ? null
        : getTabMenuItem({
            item,
            name: TabMenuItemName.closeOtherTabs,
            label: i18n.translate('unifiedTabs.tabMenu.closeOtherTabsMenuItem', {
              defaultMessage: 'Close other tabs',
            }),
            onClick: onCloseOtherTabs,
            icon: iconFor('cross'),
          });

    const closeTabsToTheRightItem =
      disableCloseTabsMenuItems || isLastTab(tabsState, item)
        ? null
        : getTabMenuItem({
            item,
            name: TabMenuItemName.closeTabsToTheRight,
            label: i18n.translate('unifiedTabs.tabMenu.closeTabsToTheRightMenuItem', {
              defaultMessage: 'Close tabs to the right',
            }),
            onClick: onCloseTabsToTheRight,
            icon: iconFor('sortRight'),
          });

    const items: TabMenuItem[] = [
      getTabMenuItem({
        item,
        name: TabMenuItemName.enterRenamingMode,
        label: i18n.translate('unifiedTabs.tabMenu.renameTabMenuItem', {
          defaultMessage: 'Rename',
        }),
        onClick: null,
        icon: iconFor('pencil'),
      }),
    ];

    if (!maxItemsCount || tabsState.items.length < maxItemsCount) {
      items.push(
        getTabMenuItem({
          item,
          name: TabMenuItemName.duplicate,
          label: i18n.translate('unifiedTabs.tabMenu.duplicateMenuItem', {
            defaultMessage: 'Duplicate',
          }),
          onClick: onDuplicate,
          icon: iconFor('copy'),
        })
      );
    }

    const topItems = getTopTabMenuItems?.(item);
    if (topItems && topItems.length > 0) {
      items.push(...topItems);
    }

    if (closeOtherTabsItem || closeTabsToTheRightItem) {
      if (items.length > 0) {
        items.push(DividerMenuItem);
      }

      if (closeOtherTabsItem) {
        items.push(closeOtherTabsItem);
      }

      if (closeTabsToTheRightItem) {
        items.push(closeTabsToTheRightItem);
      }
    }

    // Add any additional menu items provided by the consumer
    const additionalItems = getAdditionalTabMenuItems?.(item);
    if (additionalItems && additionalItems.length > 0) {
      if (items.length > 0) {
        items.push(DividerMenuItem);
      }
      items.push(...additionalItems);
    }

    return items;
  };
};
