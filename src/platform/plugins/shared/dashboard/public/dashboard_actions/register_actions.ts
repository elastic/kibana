/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CONTEXT_MENU_TRIGGER, PANEL_NOTIFICATION_TRIGGER } from '@kbn/embeddable-plugin/public';
import { DashboardStartDependencies } from '../plugin';
import {
  ACTION_ADD_TO_LIBRARY,
  ACTION_CLONE_PANEL,
  ACTION_COPY_TO_DASHBOARD,
  ACTION_EXPAND_PANEL,
  ACTION_EXPORT_CSV,
  ACTION_LEGACY_ADD_TO_LIBRARY,
  ACTION_LEGACY_UNLINK_FROM_LIBRARY,
  ACTION_UNLINK_FROM_LIBRARY,
  BADGE_FILTERS_NOTIFICATION,
} from './constants';

export const registerActions = async ({
  plugins,
  allowByValueEmbeddables,
}: {
  allowByValueEmbeddables?: boolean;
  plugins: DashboardStartDependencies;
}) => {
  const { uiActions, share } = plugins;

  uiActions.registerActionAsync(ACTION_CLONE_PANEL, async () => {
    const { ClonePanelAction } = await import('./actions_module');
    return new ClonePanelAction();
  });
  uiActions.attachAction(CONTEXT_MENU_TRIGGER, ACTION_CLONE_PANEL);

  uiActions.registerActionAsync(ACTION_EXPAND_PANEL, async () => {
    const { ExpandPanelAction } = await import('./actions_module');
    return new ExpandPanelAction();
  });
  uiActions.attachAction(CONTEXT_MENU_TRIGGER, ACTION_EXPAND_PANEL);

  uiActions.registerActionAsync(BADGE_FILTERS_NOTIFICATION, async () => {
    const { FiltersNotificationAction } = await import('./actions_module');
    return new FiltersNotificationAction();
  });
  uiActions.attachAction(PANEL_NOTIFICATION_TRIGGER, BADGE_FILTERS_NOTIFICATION);

  if (share) {
    uiActions.registerActionAsync(ACTION_EXPORT_CSV, async () => {
      const { ExportCSVAction } = await import('./actions_module');
      return new ExportCSVAction();
    });
    uiActions.attachAction(CONTEXT_MENU_TRIGGER, ACTION_EXPORT_CSV);
  }

  if (allowByValueEmbeddables) {
    uiActions.registerActionAsync(ACTION_ADD_TO_LIBRARY, async () => {
      const { AddToLibraryAction } = await import('./actions_module');
      return new AddToLibraryAction();
    });
    uiActions.attachAction(CONTEXT_MENU_TRIGGER, ACTION_ADD_TO_LIBRARY);

    uiActions.registerActionAsync(ACTION_LEGACY_ADD_TO_LIBRARY, async () => {
      const { LegacyAddToLibraryAction } = await import('./actions_module');
      return new LegacyAddToLibraryAction();
    });
    uiActions.attachAction(CONTEXT_MENU_TRIGGER, ACTION_LEGACY_ADD_TO_LIBRARY);

    uiActions.registerActionAsync(ACTION_UNLINK_FROM_LIBRARY, async () => {
      const { UnlinkFromLibraryAction } = await import('./actions_module');
      return new UnlinkFromLibraryAction();
    });
    uiActions.attachAction(CONTEXT_MENU_TRIGGER, ACTION_UNLINK_FROM_LIBRARY);

    uiActions.registerActionAsync(ACTION_LEGACY_UNLINK_FROM_LIBRARY, async () => {
      const { LegacyUnlinkFromLibraryAction } = await import('./actions_module');
      return new LegacyUnlinkFromLibraryAction();
    });
    uiActions.attachAction(CONTEXT_MENU_TRIGGER, ACTION_LEGACY_UNLINK_FROM_LIBRARY);

    uiActions.registerActionAsync(ACTION_COPY_TO_DASHBOARD, async () => {
      const { CopyToDashboardAction } = await import('./actions_module');
      return new CopyToDashboardAction();
    });
    uiActions.attachAction(CONTEXT_MENU_TRIGGER, ACTION_COPY_TO_DASHBOARD);
  }
};
