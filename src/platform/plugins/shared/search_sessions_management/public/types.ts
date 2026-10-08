/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { BackgroundSearchOpenedHandler } from './sessions_mgmt/types';

export interface SearchSessionsManagementSetupDependencies {
  data: DataPublicPluginSetup;
  management: ManagementSetup;
}

export interface SearchSessionsManagementStartDependencies {
  data: DataPublicPluginStart;
  share: SharePluginStart;
}

export interface OpenSearchSessionsFlyoutAttrs {
  appId: string;
  trackingProps: { openedFrom: string };
  onBackgroundSearchOpened?: BackgroundSearchOpenedHandler;
  onClose?: () => void;
}

export interface SearchSessionsManagementPluginStart {
  /**
   * Opens the Background searches flyout, a table to manage the user's search sessions.
   */
  openFlyout: (attrs: OpenSearchSessionsFlyoutAttrs) => void;
}
