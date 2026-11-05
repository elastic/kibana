/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { CustomBulkActions } from '@kbn/unified-data-table';
import { type ExpandedDocRef, getExpandedDocRef } from '../../utils/expanded_doc';
import {
  type OpenIndexEditorDeps,
  buildDocumentIdFilter,
  isDocumentEditable,
  openIndexEditor,
} from './edit_documents_action';

export const MAX_BULK_EDIT_DOCUMENTS = 1000;

export interface EditSelectedDocumentsBulkActionDeps extends OpenIndexEditorDeps {
  /** ES|QL rows point at the concrete backing index, so the label is worded differently. */
  isEsqlMode: boolean;
  /** Resolves the current table records for the given selection ids (selection holds table ids). */
  getRecordsByIds: (ids: string[]) => DataTableRecord[];
}

type EditSelectedDocumentsBulkAction = CustomBulkActions[number];

const editSelectedDocumentsLabel = i18n.translate('discover.editSelectedDocuments.dataViewLabel', {
  defaultMessage: 'Edit selected documents',
});

const editSelectedBackingDocumentsLabel = i18n.translate(
  'discover.editSelectedDocuments.esqlLabel',
  { defaultMessage: 'Edit selected backing documents' }
);

/** The action applies only to a multi-row selection where every row is an editable document. */
const canEditSelection = (
  selectedDocIds: string[],
  getRecordsByIds: (ids: string[]) => DataTableRecord[]
): boolean => {
  if (selectedDocIds.length <= 1) {
    return false;
  }
  const records = getRecordsByIds(selectedDocIds);
  return records.length === selectedDocIds.length && records.every(isDocumentEditable);
};

const openEditorForSelection = (
  selectedDocIds: string[],
  { isEsqlMode, getRecordsByIds, ...deps }: EditSelectedDocumentsBulkActionDeps
): void => {
  const refs = getRecordsByIds(selectedDocIds)
    .map(getExpandedDocRef)
    .filter((ref): ref is ExpandedDocRef => ref !== undefined);
  if (refs.length === 0) {
    return;
  }

  // The editor edits a single index, so a selection spanning indices cannot be opened as one batch.
  const indices = new Set(refs.map((ref) => ref.index));
  if (indices.size > 1) {
    deps.notifications.toasts.addDanger({
      title: i18n.translate('discover.editSelectedDocuments.differentIndicesTitle', {
        defaultMessage:
          'The selected documents belong to different indices. Select documents from a single index to edit them together.',
      }),
    });
    return;
  }

  if (refs.length > MAX_BULK_EDIT_DOCUMENTS) {
    deps.notifications.toasts.addDanger({
      title: i18n.translate('discover.editSelectedDocuments.tooManyTitle', {
        defaultMessage:
          'You can edit up to {max} documents at once. Narrow your selection and try again.',
        values: { max: MAX_BULK_EDIT_DOCUMENTS },
      }),
    });
    return;
  }

  void openIndexEditor({
    indexName: refs[0].index,
    filter: buildDocumentIdFilter(refs.map((ref) => ref.id)),
    triggerSource: 'discover_bulk_action',
    ...deps,
  });
};

/**
 * A selection-menu action that opens the index editor scoped to the selected documents, so several
 * Discover results can be edited together. Shown only for a multi-row selection where every row is
 * an editable document. On click it rejects a selection spanning multiple indices or exceeding the
 * {@link MAX_BULK_EDIT_DOCUMENTS} limit with a danger toast, and checks write privilege before opening.
 */
export const createEditSelectedDocumentsBulkAction = (
  deps: EditSelectedDocumentsBulkActionDeps
): EditSelectedDocumentsBulkAction => ({
  key: 'editSelectedDocuments',
  'data-test-subj': 'discoverEditSelectedDocumentsButton',
  icon: 'pencil',
  label: deps.isEsqlMode ? editSelectedBackingDocumentsLabel : editSelectedDocumentsLabel,
  isAvailable: ({ selectedDocIds }) => canEditSelection(selectedDocIds, deps.getRecordsByIds),
  onClick: ({ selectedDocIds }) => openEditorForSelection(selectedDocIds, deps),
});
