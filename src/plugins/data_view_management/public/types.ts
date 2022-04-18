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
} from '@kbn/core/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { KibanaReactContextValue } from '@kbn/kibana-react-plugin/public';
import { IndexPatternFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';
import { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { IndexPatternManagementStart } from '.';

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
