/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ChromeStart,
  CoreStart,
  IUiSettingsClient,
  OverlayStart,
  NotificationsStart,
  DocLinksStart,
  HttpSetup,
  ApplicationStart,
} from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import type { KibanaReactContextValue } from '@kbn/kibana-react-plugin/public';
import type { IndexPatternFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';
import type { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { SavedObjectsManagementPluginStart } from '@kbn/saved-objects-management-plugin/public';
import type { SettingsStart } from '@kbn/core-ui-settings-browser';
import type { NoDataPagePluginSetup } from '@kbn/no-data-page-plugin/public';
import { SharePluginStart } from '@kbn/share-plugin/public';
import type { IndexPatternManagementStart } from '.';
import type { DataViewMgmtService } from './management_app/data_view_management_service';

export type StartServices = Pick<CoreStart, 'analytics' | 'i18n' | 'theme'>;

export interface IndexPatternManagmentContext extends StartServices {
  dataViewMgmtService: DataViewMgmtService;
  application: ApplicationStart;
  chrome: ChromeStart;
  uiSettings: IUiSettingsClient;
  settings: SettingsStart;
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
  share?: SharePluginStart;
  spaces?: SpacesPluginStart;
  savedObjectsManagement: SavedObjectsManagementPluginStart;
  noDataPage?: NoDataPagePluginSetup;
}

export type IndexPatternManagmentContextValue =
  KibanaReactContextValue<IndexPatternManagmentContext>;
