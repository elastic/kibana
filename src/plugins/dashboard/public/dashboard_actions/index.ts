/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CONTEXT_MENU_TRIGGER, PANEL_NOTIFICATION_TRIGGER } from '@kbn/embeddable-plugin/public';
import { CoreStart } from '@kbn/core/public';
import { getSavedObjectFinder } from '@kbn/saved-objects-plugin/public';

import { ExportCSVAction } from './export_csv_action';
import { ClonePanelAction } from './clone_panel_action';
import { DashboardStartDependencies } from '../plugin';
import { ExpandPanelAction } from './expand_panel_action';
import { ReplacePanelAction } from './replace_panel_action';
import { AddToLibraryAction } from './add_to_library_action';
import { CopyToDashboardAction } from './copy_to_dashboard_action';
import { UnlinkFromLibraryAction } from './unlink_from_library_action';
import { FiltersNotificationAction } from './filters_notification_action';
import { LibraryNotificationAction } from './library_notification_action';

interface BuildAllDashboardActionsProps {
  core: CoreStart;
  allowByValueEmbeddables?: boolean;
  plugins: DashboardStartDependencies;
}

export const buildAllDashboardActions = async ({
  core,
  plugins,
  allowByValueEmbeddables,
}: BuildAllDashboardActionsProps) => {
  const { uiSettings } = core;
  const { uiActions, share, presentationUtil } = plugins;

  const clonePanelAction = new ClonePanelAction(core.savedObjects);
  uiActions.registerAction(clonePanelAction);
  uiActions.attachAction(CONTEXT_MENU_TRIGGER, clonePanelAction.id);

  const SavedObjectFinder = getSavedObjectFinder(core.savedObjects, uiSettings);
  const changeViewAction = new ReplacePanelAction(SavedObjectFinder);
  uiActions.registerAction(changeViewAction);
  uiActions.attachAction(CONTEXT_MENU_TRIGGER, changeViewAction.id);

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

    const unlinkFromLibraryAction = new UnlinkFromLibraryAction();
    uiActions.registerAction(unlinkFromLibraryAction);
    uiActions.attachAction(CONTEXT_MENU_TRIGGER, unlinkFromLibraryAction.id);

    const libraryNotificationAction = new LibraryNotificationAction(unlinkFromLibraryAction);
    uiActions.registerAction(libraryNotificationAction);
    uiActions.attachAction(PANEL_NOTIFICATION_TRIGGER, libraryNotificationAction.id);

    const copyToDashboardAction = new CopyToDashboardAction(presentationUtil.ContextProvider);
    uiActions.registerAction(copyToDashboardAction);
    uiActions.attachAction(CONTEXT_MENU_TRIGGER, copyToDashboardAction.id);
  }
};
