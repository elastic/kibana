/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggregateQuery, Query } from '@kbn/es-query';
import type { CoreStart } from '@kbn/core/public';
import type { TabsEventDataKeys } from './event_data_keys';

export interface TabItem {
  id: string;
  label: string;
  duplicatedFromId?: string; // ID of the tab from which this tab was duplicated
  restoredFromId?: string; // ID of the closed tab from which this tab was restored
  customMenuButton?: React.JSX.Element;
}

export type RecentlyClosedTabItem = TabItem & {
  closedAt: number;
};

export interface TabsSizeConfig {
  isScrollable: boolean;
  regularTabMaxWidth: number;
  regularTabMinWidth: number;
  // TODO: extend with possibly different sizes for pinned tabs
}

export enum TabStatus {
  DEFAULT = 'default',
  RUNNING = 'running',
  SUCCESS = 'success',
  ERROR = 'danger',
}

export interface TabPreviewData {
  title?: string;
  query: AggregateQuery | Query;
  status: TabStatus;
}

export enum TabMenuItemName {
  enterRenamingMode = 'enterRenamingMode',
  duplicate = 'duplicate',
  closeOtherTabs = 'closeOtherTabs',
  closeTabsToTheRight = 'closeTabsToTheRight',
}

export interface TabMenuItemWithClick {
  'data-test-subj': string;
  name: TabMenuItemName | string;
  label: string;
  onClick: (() => void) | null; // `null` can be overridden inside tab menu
}

export type TabMenuItem = TabMenuItemWithClick | 'divider';

export type GetTabMenuItems = (item: TabItem) => TabMenuItem[];

export interface TabsServices {
  core: {
    chrome?: CoreStart['chrome'];
  };
}

export enum TabsEventName {
  tabCreated = 'tabCreated',
  tabClosed = 'tabClosed',
  tabSwitched = 'tabSwitched',
  tabReordered = 'tabReordered',
  tabDuplicated = 'tabDuplicated',
  tabClosedOthers = 'tabClosedOthers',
  tabClosedToTheRight = 'tabClosedToTheRight',
  tabRenamed = 'tabRenamed',
  tabsLimitReached = 'tabsLimitReached',
  tabsKeyboardShortcutsUsed = 'tabsKeyboardShortcutsUsed',
  tabsRestoredOnLoad = 'tabsRestoredOnLoad',
  tabSelectRecentlyClosed = 'tabSelectRecentlyClosed',
}

export interface TabsEBTEvent {
  [TabsEventDataKeys.TABS_EVENT_NAME]: TabsEventName;
  [TabsEventDataKeys.TAB_ID]?: string;
  [TabsEventDataKeys.TOTAL_TABS_OPEN]?: number;
  [TabsEventDataKeys.FROM_INDEX]?: number;
  [TabsEventDataKeys.TO_INDEX]?: number;
  [TabsEventDataKeys.REMAINING_TABS_COUNT]?: number;
  [TabsEventDataKeys.CLOSED_TABS_COUNT]?: number;
  [TabsEventDataKeys.SHORTCUT_USED]?: string;
}
