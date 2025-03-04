/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { TabItem, GetTabMenuItems, TabMenuItemWithClick } from '../types';

const DividerMenuItem = 'divider';

interface TabMenuItemProps {
  name: string;
  label: string;
  item: TabItem;
  onClick: (item: TabItem) => void;
}

const getTabMenuItem = ({
  name,
  label,
  item,
  onClick,
}: TabMenuItemProps): TabMenuItemWithClick => ({
  'data-test-subj': `unifiedTabs_tabMenuItem_${name}`,
  name,
  label,
  onClick: () => onClick(item),
});

export interface TabMenuActions {
  onDuplicate: (item: TabItem) => void;
  onCloseOtherTabs: (item: TabItem) => void;
  onCloseTabsToTheRight: (item: TabItem) => void;
}

export const getTabMenuActions = ({
  onDuplicate,
  onCloseOtherTabs,
  onCloseTabsToTheRight,
}: TabMenuActions): GetTabMenuItems => {
  return (item) => [
    getTabMenuItem({
      item,
      name: 'duplicate',
      label: i18n.translate('unifiedTabs.tabMenu.duplicateMenuItem', {
        defaultMessage: 'Duplicate',
      }),
      onClick: onDuplicate,
    }),
    DividerMenuItem,
    getTabMenuItem({
      item,
      name: 'closeOtherTabs',
      label: i18n.translate('unifiedTabs.tabMenu.closeOtherTabsMenuItem', {
        defaultMessage: 'Close other tabs',
      }),
      onClick: onCloseOtherTabs,
    }),
    getTabMenuItem({
      item,
      name: 'closeTabsToTheRight',
      label: i18n.translate('unifiedTabs.tabMenu.closeTabsToTheRightMenuItem', {
        defaultMessage: 'Close tabs to the right',
      }),
      onClick: onCloseTabsToTheRight,
    }),
  ];
};
