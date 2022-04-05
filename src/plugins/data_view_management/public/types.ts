/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  ChromeStart,
  IUiSettingsClient,
  OverlayStart,
  NotificationsStart,
  DocLinksStart,
  HttpSetup,
  ApplicationStart,
} from 'src/core/public';
import { DataPublicPluginStart } from 'src/plugins/data/public';
import { UnifiedSearchPublicPluginStart } from '../../unified_search/public';
import { ManagementAppMountParams } from '../../management/public';
import { IndexPatternManagementStart } from './index';
import { KibanaReactContextValue } from '../../kibana_react/public';
import { IndexPatternFieldEditorStart } from '../../data_view_field_editor/public';
import { DataViewEditorStart } from '../../data_view_editor/public';
import { DataViewsPublicPluginStart } from '../../data_views/public';
import { FieldFormatsStart } from '../../field_formats/public';
import { SpacesPluginStart } from '../../../../x-pack/plugins/spaces/public';

export interface IndexPatternManagmentContext {
  application: ApplicationStart;
  chrome: ChromeStart;
  uiSettings: IUiSettingsClient;
  notifications: NotificationsStart;
  overlays: OverlayStart;
  http: HttpSetup;
  docLinks: DocLinksStart;
  data: DataPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  dataViewFieldEditor: IndexPatternFieldEditorStart;
  indexPatternManagementStart: IndexPatternManagementStart;
  setBreadcrumbs: ManagementAppMountParams['setBreadcrumbs'];
  fieldFormatEditors: IndexPatternFieldEditorStart['fieldFormatEditors'];
  IndexPatternEditor: DataViewEditorStart['IndexPatternEditorComponent'];
  fieldFormats: FieldFormatsStart;
  spaces?: SpacesPluginStart;
}

export type IndexPatternManagmentContextValue =
  KibanaReactContextValue<IndexPatternManagmentContext>;
