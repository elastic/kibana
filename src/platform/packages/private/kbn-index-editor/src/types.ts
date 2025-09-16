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
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { IndexUpdateService } from './index_update_service';

export interface EditLookupIndexContentContext {
  indexName?: string;
  doesIndexExist: boolean;
  canEditIndex: boolean;
  onClose?: (result: {
    indexName: string | null;
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
  storage: Storage;
  indexUpdateService: IndexUpdateService;
  fileManager: FileUploadManager;
};

/** Extended kibana context */
export interface KibanaContextExtra {
  share: SharePluginStart;
  data: DataPublicPluginStart;
  uiActions: UiActionsStart;
  overlays: CoreStart['overlays'];
  rendering: CoreStart['rendering'];
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
  storage: Storage;
}

export interface IndexEditorError {
  id: IndexEditorErrors;
  details?: string;
}

export enum IndexEditorErrors {
  GENERIC_SAVING_ERROR = 'genericSavingError',
  PARTIAL_SAVING_ERROR = 'partialSavingError',
  FILE_REJECTION_ERROR = 'fileRejectionError',
  FILE_TOO_BIG_ERROR = 'fileTooBigError',
  FILE_UPLOAD_ERROR = 'fileUploadError',
  FILE_ANALYSIS_ERROR = 'fileAnalysisError',
}
