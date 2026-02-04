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
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { EDIT_LOOKUP_INDEX_CONTENT_TRIGGER_ID } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { createFlyout } from '../components/create_flyout';
import { IndexUpdateService } from '../services/index_update_service';
import type { EditLookupIndexContentContext, EditLookupIndexFlyoutDeps } from '../types';
import { IndexEditorTelemetryService } from '../telemetry/telemetry_service';

export function createEditLookupIndexContentAction(
  dependencies: EditLookupIndexFlyoutDeps
): UiActionsActionDefinition<EditLookupIndexContentContext> {
  return {
    id: 'create-open-edit-lookup-index-action',
    type: EDIT_LOOKUP_INDEX_CONTENT_TRIGGER_ID,
    getIconType(context): string {
      return 'indexEdit';
    },
    getDisplayName: () =>
      i18n.translate('indexEditor.actions.displayName', {
        defaultMessage: 'Open lookup index editor UI',
      }),
    async execute(context: EditLookupIndexContentContext) {
      const { coreStart, data } = dependencies;

      const indexEditorTelemetryService = new IndexEditorTelemetryService(
        coreStart.analytics,
        context.canEditIndex,
        context.doesIndexExist,
        context.triggerSource
      );

      const indexUpdateService = new IndexUpdateService(
        coreStart.http,
        data,
        coreStart.notifications,
        indexEditorTelemetryService,
        context.canEditIndex
      );

      const { indexName, doesIndexExist } = context;

      // It can happen that the caller has outdated information about the index existence
      if (doesIndexExist && indexName) {
        const indexExists = await indexUpdateService.doesIndexExist(indexName);
        if (!indexExists) {
          coreStart.notifications.toasts.addError(new Error('Index does not exist'), {
            title: i18n.translate('indexEditor.actions.indexDoesNotExistErrorMessage', {
              defaultMessage: 'Index "{indexName}" does not exist anymore.',
              values: { indexName },
            }),
          });
          return;
        }
      }

      const existingIndexName = doesIndexExist ? indexName : null;

      const storage = new Storage(localStorage);

      try {
        createFlyout(
          {
            ...dependencies,
            indexUpdateService,
            indexEditorTelemetryService,
            storage,
            existingIndexName,
          },
          context
        );
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
