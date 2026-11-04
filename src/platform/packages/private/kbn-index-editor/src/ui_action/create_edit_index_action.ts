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
import { EDIT_INDEX_CONTENT_TRIGGER_ID } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { createFlyout } from '../components/create_flyout';
import { IndexUpdateService } from '../services/index_update_service';
import {
  assessIndexEditability,
  getIndexEditabilityErrorTitle,
} from '../services/index_editability';
import type { EditIndexContentContext, EditIndexFlyoutDeps } from '../types';
import { IndexEditorTelemetryService } from '../telemetry/telemetry_service';

export function createEditIndexContentAction(
  dependencies: EditIndexFlyoutDeps
): UiActionsActionDefinition<EditIndexContentContext> {
  return {
    id: 'create-open-edit-index-action',
    type: EDIT_INDEX_CONTENT_TRIGGER_ID,
    getIconType(context): string {
      return 'indexEdit';
    },
    getDisplayName: () =>
      i18n.translate('indexEditor.actions.displayName', {
        defaultMessage: 'Open index editor UI',
      }),
    async execute(context: EditIndexContentContext) {
      const { coreStart, data } = dependencies;

      const indexMode = context.indexMode ?? 'standard';

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
        context.canEditIndex,
        indexMode
      );

      const { indexName, doesIndexExist } = context;

      // Pre-flight for editing: the caller's view of an existing index can be stale or coarse, so
      // resolve the name server-side and apply the editing policy before opening the flyout. This
      // rejects targets the editor cannot handle (aliases, data streams, closed/frozen/other-mode
      // indices, or a name that no longer exists) with a clear reason, instead of failing later at
      // save time. Creation is intentionally not gated here: the name is an editable prefill, and a
      // collision is reported at save time by the create request. Resolution is best-effort: when it
      // cannot be determined we proceed and rely on the save-time error callout as a safety net.
      if (doesIndexExist && indexName) {
        const resolution = await indexUpdateService.fetchIndexResolution(indexName);
        if (resolution) {
          const verdict = assessIndexEditability(resolution, { indexMode });
          if (!verdict.editable) {
            coreStart.notifications.toasts.addDanger({
              title: getIndexEditabilityErrorTitle(verdict.reason, indexName),
            });
            return;
          }
          // Runtime fields are editable-index columns that cannot be persisted, so mark them
          // read-only in the grid instead of blocking the whole index.
          indexUpdateService.setReadOnlyColumns(resolution.runtimeFields);
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
