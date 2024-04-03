/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart } from '@kbn/core/public';
import { CONTEXT_MENU_TRIGGER, PANEL_NOTIFICATION_TRIGGER } from '@kbn/embeddable-plugin/public';
import {
  getSavedObjectFinder,
  SavedObjectFinderProps,
} from '@kbn/saved-objects-finder-plugin/public';

import { DashboardStartDependencies } from '../plugin';
import { AddToLibraryAction } from './add_to_library_action';
import { LegacyAddToLibraryAction } from './legacy_add_to_library_action';
import { ClonePanelAction } from './clone_panel_action';
import { CopyToDashboardAction } from './copy_to_dashboard_action';
import { ExpandPanelAction } from './expand_panel_action';
import { ExportCSVAction } from './export_csv_action';
import { FiltersNotificationAction } from './filters_notification_action';
import { LegacyLibraryNotificationAction } from './legacy_library_notification_action';
import { ReplacePanelAction } from './replace_panel_action';
import { UnlinkFromLibraryAction } from './unlink_from_library_action';
import { LegacyUnlinkFromLibraryAction } from './legacy_unlink_from_library_action';
import { LibraryNotificationAction } from './library_notification_action';

interface BuildAllDashboardActionsProps {
  core: CoreStart;
  allowByValueEmbeddables?: boolean;
  plugins: DashboardStartDependencies;
}

export type ReplacePanelSOFinder = (props: Omit<SavedObjectFinderProps, 'services'>) => JSX.Element;

export const buildAllDashboardActions = async ({
  core,
  plugins,
  allowByValueEmbeddables,
}: BuildAllDashboardActionsProps) => {
  const { uiActions, share, savedObjectsTaggingOss, contentManagement } = plugins;

  const clonePanelAction = new ClonePanelAction();
  uiActions.registerAction(clonePanelAction);
  uiActions.attachAction(CONTEXT_MENU_TRIGGER, clonePanelAction.id);

  const SavedObjectFinder = getSavedObjectFinder(
    contentManagement.client,
    core.uiSettings,
    savedObjectsTaggingOss?.getTaggingApi()
  );
  const changeViewAction = new ReplacePanelAction(SavedObjectFinder as ReplacePanelSOFinder);
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

    const legacyAddToLibraryAction = new LegacyAddToLibraryAction();
    uiActions.registerAction(legacyAddToLibraryAction);
    uiActions.attachAction(CONTEXT_MENU_TRIGGER, legacyAddToLibraryAction.id);

    const unlinkFromLibraryAction = new UnlinkFromLibraryAction();
    uiActions.registerAction(unlinkFromLibraryAction);
    uiActions.attachAction(CONTEXT_MENU_TRIGGER, unlinkFromLibraryAction.id);

    const libraryNotificationAction = new LibraryNotificationAction(unlinkFromLibraryAction);
    uiActions.registerAction(libraryNotificationAction);
    uiActions.attachAction(PANEL_NOTIFICATION_TRIGGER, libraryNotificationAction.id);

    const legacyUnlinkFromLibraryAction = new LegacyUnlinkFromLibraryAction();
    uiActions.registerAction(legacyUnlinkFromLibraryAction);
    uiActions.attachAction(CONTEXT_MENU_TRIGGER, legacyUnlinkFromLibraryAction.id);

    const legacyLibraryNotificationAction = new LegacyLibraryNotificationAction(
      legacyUnlinkFromLibraryAction
    );
    uiActions.registerAction(legacyLibraryNotificationAction);
    uiActions.attachAction(PANEL_NOTIFICATION_TRIGGER, legacyLibraryNotificationAction.id);

    const copyToDashboardAction = new CopyToDashboardAction(core);
    uiActions.registerAction(copyToDashboardAction);
    uiActions.attachAction(CONTEXT_MENU_TRIGGER, copyToDashboardAction.id);
  }
};
