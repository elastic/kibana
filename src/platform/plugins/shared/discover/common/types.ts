/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export enum TabUrlAction {
  /**
   * The `action` value used to indicate that a new tab should be created.
   */
  new = 'new',
  /**
   * The `action` value used to indicate that a link was created via Share functionality.
   */
  shared = 'shared',
}

export interface TabsUrlState {
  /**
   * Syncing the selected tab id with the URL
   */
  tabId?: string;
  /**
   * (Optional) Label for the tab, used when creating a new tab via locator URL or opening a shared link.
   */
  tabLabel?: string;
  /**
   * (Optional) Action for the tab, used when creating and opening a shared link.
   */
  action?: TabUrlAction;
}
