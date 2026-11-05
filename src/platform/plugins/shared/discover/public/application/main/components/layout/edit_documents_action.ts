/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SecurityHasPrivilegesResponse } from '@elastic/elasticsearch/lib/api/types';
import { i18n } from '@kbn/i18n';
import { type Query, escapeQuotes } from '@kbn/es-query';
import type { HttpStart, NotificationsStart } from '@kbn/core/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { EDIT_INDEX_CONTENT_TRIGGER_ID } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { INDEX_EDITOR_PRIVILEGES_ROUTE } from '@kbn/esql-types';
import type { EditIndexContentContext } from '@kbn/index-editor';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getExpandedDocRef } from '../../utils/expanded_doc';

/** Services the index editor needs to open scoped to one or more documents. */
export interface OpenIndexEditorDeps {
  http: HttpStart;
  notifications: NotificationsStart;
  uiActions: UiActionsStart;
  /** Called after the editor closes so Discover refetches and shows the saved edits. */
  onEdited: () => void;
}

/**
 * Elasticsearch hides system, internal, and data-stream backing indices behind dot-prefixed names
 * (`.kibana`, `.internal.*`, `.ds-*`). A Discover row's `_index` is the concrete index, so a data
 * stream row resolves to a `.ds-*` backing index. None of these can be edited safely here.
 */
const isReservedIndexName = (indexName: string): boolean => indexName.startsWith('.');

/**
 * A cross-cluster index carries its cluster alias as a `<cluster>:<index>` prefix. Elasticsearch
 * forbids `:` in real index names, so its presence unambiguously marks a remote index. Writes target
 * the local cluster and cannot reach remote indices, so these are not editable here.
 */
const isRemoteIndexName = (indexName: string): boolean => indexName.includes(':');

/** A row is editable when it carries a stable `_id`/`_index` identity on a local, non-reserved index. */
export const isDocumentEditable = (record: DataTableRecord): boolean => {
  const ref = getExpandedDocRef(record);
  return ref !== undefined && !isReservedIndexName(ref.index) && !isRemoteIndexName(ref.index);
};

/** Builds a KQL filter scoping the editor to the given document ids, with quotes escaped. */
export const buildDocumentIdFilter = (ids: string[]): Query => {
  const quoted = ids.map((id) => `"${escapeQuotes(id)}"`);
  const query = quoted.length === 1 ? `_id: ${quoted[0]}` : `_id: (${quoted.join(' or ')})`;
  return { language: 'kuery', query };
};

/** Best-effort write-privilege check; a failure is treated as "no access" rather than opening. */
const userCanEditIndex = async (indexName: string, http: HttpStart): Promise<boolean> => {
  try {
    const privileges = await http.get<SecurityHasPrivilegesResponse['index']>(
      INDEX_EDITOR_PRIVILEGES_ROUTE,
      { query: { indexName } }
    );
    return Boolean(privileges['*']?.write || privileges[indexName]?.write);
  } catch {
    return false;
  }
};

/**
 * Checks write privilege on the index, then opens the index editor scoped to the given filter. When
 * the user lacks write access a danger toast is shown and the editor stays closed.
 */
export const openIndexEditor = async ({
  indexName,
  filter,
  triggerSource,
  http,
  notifications,
  uiActions,
  onEdited,
}: OpenIndexEditorDeps & {
  indexName: string;
  filter: Query;
  triggerSource: string;
}): Promise<void> => {
  if (!(await userCanEditIndex(indexName, http))) {
    notifications.toasts.addDanger({
      title: i18n.translate('discover.editDocuments.noPermissionTitle', {
        defaultMessage: `You don't have permission to edit documents in "{indexName}".`,
        values: { indexName },
      }),
    });
    return;
  }

  const context: EditIndexContentContext = {
    indexName,
    doesIndexExist: true,
    canEditIndex: true,
    indexMode: 'standard',
    triggerSource,
    // Scope the editor to the selected document(s). Surfaced in the editor's KQL bar so it is clearable.
    initialFilter: filter,
    onClose: onEdited,
  };

  await uiActions.executeTriggerActions(EDIT_INDEX_CONTENT_TRIGGER_ID, context);
};
