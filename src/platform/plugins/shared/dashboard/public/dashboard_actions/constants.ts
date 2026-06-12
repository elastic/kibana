/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const DASHBOARD_ACTION_GROUP = { id: 'dashboard_actions', order: 10 } as const;
export const DASHBOARD_EXPORT_GROUP = {
  id: 'export_actions',
  order: 9,
  // asContextMenu: true,
  getIconType: () => 'upload',
  getDisplayName: () =>
    i18n.translate('dashboard.actions.exportDisplayName', {
      defaultMessage: 'Export',
    }),
} as const;

export const ACTION_ADD_TO_LIBRARY = 'saveToLibrary';
export const ACTION_CLONE_PANEL = 'clonePanel';
export const ACTION_COPY_TO_DASHBOARD = 'copyToDashboard';
export const ACTION_EXPAND_PANEL = 'togglePanel';
export const ACTION_EXPORT_CSV = 'ACTION_EXPORT_CSV';
export const ACTION_EXPORT_JSON = 'exportJson';
export const ACTION_UNLINK_FROM_LIBRARY = 'unlinkFromLibrary';
export const ACTION_ADD_SECTION = 'addCollapsibleSection';
export const BADGE_FILTERS_NOTIFICATION = 'ACTION_FILTERS_NOTIFICATION';
