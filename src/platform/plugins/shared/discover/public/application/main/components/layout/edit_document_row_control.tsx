/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { SecurityHasPrivilegesResponse } from '@elastic/elasticsearch/lib/api/types';
import { i18n } from '@kbn/i18n';
import { escapeQuotes } from '@kbn/es-query';
import type { HttpStart, NotificationsStart } from '@kbn/core/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { EDIT_INDEX_CONTENT_TRIGGER_ID } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { INDEX_EDITOR_PRIVILEGES_ROUTE } from '@kbn/esql-types';
import type { EditIndexContentContext } from '@kbn/index-editor';
import type { DataTableRecord, RowControlColumn } from '@kbn/discover-utils';
import { getExpandedDocRef } from '../../utils/expanded_doc';

export interface EditDocumentRowControlDeps {
  /** ES|QL rows point at the concrete backing index, so the label is worded differently. */
  isEsqlMode: boolean;
  http: HttpStart;
  notifications: NotificationsStart;
  uiActions: UiActionsStart;
  /** Called after the editor closes so Discover refetches and shows the saved edits. */
  onEdited: () => void;
}

const editDocumentLabel = i18n.translate('discover.editDocumentRowControl.dataViewLabel', {
  defaultMessage: 'Edit document',
});

const editBackingDocumentLabel = i18n.translate('discover.editDocumentRowControl.esqlLabel', {
  defaultMessage: 'Edit backing document',
});

/**
 * Elasticsearch hides system, internal, and data-stream backing indices behind dot-prefixed names
 * (`.kibana`, `.internal.*`, `.ds-*`). A Discover row's `_index` is the concrete index, so a data
 * stream row resolves to a `.ds-*` backing index. None of these can be edited safely here, so the
 * pencil is hidden for them.
 */
const isReservedIndexName = (indexName: string): boolean => indexName.startsWith('.');

/**
 * A cross-cluster index carries its cluster alias as a `<cluster>:<index>` prefix. Elasticsearch
 * forbids `:` in real index names, so its presence unambiguously marks a remote index. Writes target
 * the local cluster and cannot reach remote indices, so these are not editable here.
 */
const isRemoteIndexName = (indexName: string): boolean => indexName.includes(':');

/**
 * A row is editable when it carries a stable `_id`/`_index` identity on a local, non-reserved index.
 * Exported so callers can avoid registering the control (and reserving an empty leading column) when
 * no row qualifies, e.g. an ES|QL result without `METADATA _id, _index`.
 */
export const isDocumentEditable = (record: DataTableRecord): boolean => {
  const ref = getExpandedDocRef(record);
  return ref !== undefined && !isReservedIndexName(ref.index) && !isRemoteIndexName(ref.index);
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

const openIndexEditorForDocument = async (
  record: DataTableRecord,
  { http, notifications, uiActions, onEdited }: EditDocumentRowControlDeps
): Promise<void> => {
  const ref = getExpandedDocRef(record);
  if (!ref) {
    return;
  }
  const { id, index } = ref;

  if (!(await userCanEditIndex(index, http))) {
    notifications.toasts.addDanger({
      title: i18n.translate('discover.editDocumentRowControl.noPermissionTitle', {
        defaultMessage: `You don't have permission to edit documents in "{indexName}".`,
        values: { indexName: index },
      }),
    });
    return;
  }

  const context: EditIndexContentContext = {
    indexName: index,
    doesIndexExist: true,
    canEditIndex: true,
    indexMode: 'standard',
    triggerSource: 'discover_row_action',
    // Scope the editor to the clicked document. Surfaced in the editor's KQL bar so it is clearable.
    initialFilter: { language: 'kuery', query: `_id: "${escapeQuotes(id)}"` },
    onClose: onEdited,
  };

  await uiActions.executeTriggerActions(EDIT_INDEX_CONTENT_TRIGGER_ID, context);
};

/**
 * A leading row control that opens the index editor scoped to the clicked document, so a single
 * Discover result can be edited in place. Shown only when the row has an editable `_id`/`_index`
 * identity (classic data views always do; ES|QL needs `METADATA _id, _index`) on a non-reserved
 * index. Write privilege is checked on click, falling back to a danger toast when it is missing.
 */
export const createEditDocumentRowControl = (
  deps: EditDocumentRowControlDeps
): RowControlColumn => ({
  id: 'editDocument',
  isAvailable: ({ record }) => isDocumentEditable(record),
  render: (Control, { record }) => (
    <Control
      data-test-subj="discoverEditDocumentButton"
      label={deps.isEsqlMode ? editBackingDocumentLabel : editDocumentLabel}
      iconType="pencil"
      onClick={() => {
        void openIndexEditorForDocument(record, deps);
      }}
    />
  ),
});
