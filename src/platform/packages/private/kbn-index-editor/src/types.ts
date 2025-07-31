/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { CoreStart, IUiSettingsClient, NotificationsStart } from '@kbn/core/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { DataViewFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';
import type { ThemeServiceStart } from '@kbn/react-kibana-context-common';
import type { FileUploadManager } from '@kbn/file-upload';
import type { FileUploadPluginStart, MessageImporter } from '@kbn/file-upload-plugin/public';
import type { IndexUpdateService } from './index_update_service';

export interface EditLookupIndexContentContext {
  indexName?: string;
  doesIndexExist: boolean;
  onClose?: (result: {
    indexName: string;
    /** Indicates if the index was created */
    indexCreatedDuringFlyout: boolean;
  }) => void;
}

export interface EditLookupIndexFlyoutDeps {
  coreStart: CoreStart;
  data: DataPublicPluginStart;
  uiActions: UiActionsStart;
  fieldFormats: FieldFormatsStart;
  share: SharePluginStart;
  fileUpload: FileUploadPluginStart;
}

export type FlyoutDeps = EditLookupIndexFlyoutDeps & {
  indexUpdateService: IndexUpdateService;
  fileManager: FileUploadManager;
};

/** Extended kibana context */
export interface KibanaContextExtra {
  share: SharePluginStart;
  data: DataPublicPluginStart;
  uiActions: UiActionsStart;
  fieldFormats: FieldFormatsStart;
  dataViewFieldEditor: DataViewFieldEditorStart;
  /** Custom service for indexing documents */
  indexUpdateService: IndexUpdateService;
  fileUploadManager: FileUploadManager;
  // Required services
  theme: ThemeServiceStart;
  uiSettings: IUiSettingsClient;
  notifications: NotificationsStart;
  // Additional services
  fileUpload: FileUploadPluginStart;
  messageImporter: MessageImporter;
}
