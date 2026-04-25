/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export enum TabsEventDataKeys {
  TABS_EVENT_NAME = 'eventName',
  TAB_ID = 'tabId',
  TOTAL_TABS_OPEN = 'totalTabsOpen',
  FROM_INDEX = 'fromIndex',
  TO_INDEX = 'toIndex',
  REMAINING_TABS_COUNT = 'remainingTabsCount',
  CLOSED_TABS_COUNT = 'closedTabsCount',
  SHORTCUT_USED = 'shortcutUsed',
}
