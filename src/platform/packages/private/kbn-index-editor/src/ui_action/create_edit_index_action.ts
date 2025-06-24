/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import { FileUploadManager } from '@kbn/file-upload';
import { createFlyout } from '../components/create_flyout';
import { IndexUpdateService } from '../index_update_service';
import type { EditLookupIndexContentContext, EditLookupIndexFlyoutDeps } from '../types';
import { EDIT_LOOKUP_INDEX_CONTENT_TRIGGER_ID } from './constants';

export function createEditLookupIndexContentAction(
  dependencies: EditLookupIndexFlyoutDeps
): UiActionsActionDefinition<EditLookupIndexContentContext> {
  return {
    id: 'create-open-file-upload-lite-action',
    type: EDIT_LOOKUP_INDEX_CONTENT_TRIGGER_ID,
    getIconType(context): string {
      return 'indexEdit';
    },
    getDisplayName: () =>
      i18n.translate('xpack.dataVisualizer.file.lite.actions.displayName', {
        defaultMessage: 'Open file upload UI',
      }),
    async execute(context: EditLookupIndexContentContext) {
      // TODO consider async imports

      const { coreStart, data, fileUpload } = dependencies;

      const indexUpdateService = new IndexUpdateService(coreStart.http, data);

      const { indexName, doesIndexExist } = context;

      const existingIndexName = doesIndexExist ? indexName : null;

      const fileManager = new FileUploadManager(
        fileUpload,
        coreStart.http,
        data.dataViews,
        coreStart.notifications,
        null,
        false,
        true,
        existingIndexName,
        { index: { mode: 'lookup' } }
      );

      try {
        createFlyout({ ...dependencies, indexUpdateService, fileManager }, context);
      } catch (e) {
        return Promise.reject(e);
      }
    },
    async isCompatible() {
      // TODO check compatibility
      return true;
    },
  };
}
