/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import {
  ChromeStart,
  ApplicationStart,
  IUiSettingsClient,
  OverlayStart,
  SavedObjectsStart,
  NotificationsStart,
  DocLinksStart,
  HttpSetup,
} from 'src/core/public';
import { DataPublicPluginStart } from 'src/plugins/data/public';
import { IndexPatternFieldEditorStart } from 'src/plugins/index_pattern_field_editor/public';
import { ManagementAppMountParams } from '../../management/public';
import { IndexPatternManagementStart } from './index';
import { KibanaReactContextValue } from '../../kibana_react/public';

export interface IndexPatternManagmentContext {
  chrome: ChromeStart;
  application: ApplicationStart;
  savedObjects: SavedObjectsStart;
  uiSettings: IUiSettingsClient;
  notifications: NotificationsStart;
  overlays: OverlayStart;
  http: HttpSetup;
  docLinks: DocLinksStart;
  data: DataPublicPluginStart;
  indexPatternManagementStart: IndexPatternManagementStart;
  setBreadcrumbs: ManagementAppMountParams['setBreadcrumbs'];
  getMlCardState: () => MlCardState;
  indexPatternFieldEditor: IndexPatternFieldEditorStart;
}

export type IndexPatternManagmentContextValue = KibanaReactContextValue<IndexPatternManagmentContext>;

export enum MlCardState {
  HIDDEN,
  DISABLED,
  ENABLED,
}
