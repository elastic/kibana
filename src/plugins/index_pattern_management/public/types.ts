/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  ChromeStart,
  ApplicationStart,
  IUiSettingsClient,
  OverlayStart,
  NotificationsStart,
  DocLinksStart,
  HttpSetup,
} from 'src/core/public';
import { DataPublicPluginStart } from 'src/plugins/data/public';
import { ManagementAppMountParams } from '../../management/public';
import { IndexPatternManagementStart } from './index';
import { KibanaReactContextValue } from '../../kibana_react/public';
import { IndexPatternFieldEditorStart } from '../../index_pattern_field_editor/public';

export interface IndexPatternManagmentContext {
  chrome: ChromeStart;
  application: ApplicationStart;
  uiSettings: IUiSettingsClient;
  notifications: NotificationsStart;
  overlays: OverlayStart;
  http: HttpSetup;
  docLinks: DocLinksStart;
  data: DataPublicPluginStart;
  indexPatternFieldEditor: IndexPatternFieldEditorStart;
  indexPatternManagementStart: IndexPatternManagementStart;
  setBreadcrumbs: ManagementAppMountParams['setBreadcrumbs'];
  getMlCardState: () => MlCardState;
  fieldFormatEditors: IndexPatternFieldEditorStart['fieldFormatEditors'];
}

export type IndexPatternManagmentContextValue = KibanaReactContextValue<IndexPatternManagmentContext>;

export enum MlCardState {
  HIDDEN,
  DISABLED,
  ENABLED,
}
