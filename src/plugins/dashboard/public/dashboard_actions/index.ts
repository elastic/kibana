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
import { AddToLibraryAction } from './add_to_library_action';
import { LegacyAddToLibraryAction } from './legacy_add_to_library_action';
import { ClonePanelAction } from './clone_panel_action';
import { CopyToDashboardAction } from './copy_to_dashboard_action';
import { ExpandPanelAction } from './expand_panel_action';
import { ExportCSVAction } from './export_csv_action';
import { FiltersNotificationAction } from './filters_notification_action';
import { UnlinkFromLibraryAction } from './unlink_from_library_action';
import { LegacyUnlinkFromLibraryAction } from './legacy_unlink_from_library_action';

interface BuildAllDashboardActionsProps {
  allowByValueEmbeddables?: boolean;
  plugins: DashboardStartDependencies;
}

export const DASHBOARD_ACTION_GROUP = { id: 'dashboard_actions', order: 10 } as const;

export const buildAllDashboardActions = async ({
  plugins,
  allowByValueEmbeddables,
}: BuildAllDashboardActionsProps) => {
  const { uiActions, share } = plugins;

  const clonePanelAction = new ClonePanelAction();
  uiActions.registerAction(clonePanelAction);
  uiActions.attachAction(CONTEXT_MENU_TRIGGER, clonePanelAction.id);
  const expandPanelAction = new ExpandPanelAction();
  uiActions.registerAction(expandPanelAction);
  uiActions.attachAction(CONTEXT_MENU_TRIGGER, expandPanelAction.id);

  const panelLevelFiltersNotificationAction = new FiltersNotificationAction();
  uiActions.registerAction(panelLevelFiltersNotificationAction);
  uiActions.attachAction(PANEL_NOTIFICATION_TRIGGER, panelLevelFiltersNotificationAction.id);

  if (share) {
    const ExportCSVPlugin = new ExportCSVAction();
    uiActions.addTriggerAction(CONTEXT_MENU_TRIGGER, ExportCSVPlugin);
  }

  if (allowByValueEmbeddables) {
    const addToLibraryAction = new AddToLibraryAction();
    uiActions.registerAction(addToLibraryAction);
    uiActions.attachAction(CONTEXT_MENU_TRIGGER, addToLibraryAction.id);

    const legacyAddToLibraryAction = new LegacyAddToLibraryAction();
    uiActions.registerAction(legacyAddToLibraryAction);
    uiActions.attachAction(CONTEXT_MENU_TRIGGER, legacyAddToLibraryAction.id);

    const unlinkFromLibraryAction = new UnlinkFromLibraryAction();
    uiActions.registerAction(unlinkFromLibraryAction);
    uiActions.attachAction(CONTEXT_MENU_TRIGGER, unlinkFromLibraryAction.id);

    const legacyUnlinkFromLibraryAction = new LegacyUnlinkFromLibraryAction();
    uiActions.registerAction(legacyUnlinkFromLibraryAction);
    uiActions.attachAction(CONTEXT_MENU_TRIGGER, legacyUnlinkFromLibraryAction.id);

    const copyToDashboardAction = new CopyToDashboardAction();
    uiActions.registerAction(copyToDashboardAction);
    uiActions.attachAction(CONTEXT_MENU_TRIGGER, copyToDashboardAction.id);
  }
};
