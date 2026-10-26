/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { NEW_TAB_ID } from './constants';

export interface TabsUrlState {
  /**
   * Syncing the selected tab id with the URL
   */
  tabId?: typeof NEW_TAB_ID | string;
  /**
   * (Optional) Label for the tab, used when creating a new tab via locator URL or opening a shared link.
   */
  tabLabel?: string;
}
