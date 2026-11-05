/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { DataTableRecord, RowControlColumn } from '@kbn/discover-utils';
import { getExpandedDocRef } from '../../utils/expanded_doc';
import {
  type OpenIndexEditorDeps,
  buildDocumentIdFilter,
  isDocumentEditable,
  openIndexEditor,
} from './edit_documents_action';

export interface EditDocumentRowControlDeps extends OpenIndexEditorDeps {
  /** ES|QL rows point at the concrete backing index, so the label is worded differently. */
  isEsqlMode: boolean;
}

const editDocumentLabel = i18n.translate('discover.editDocumentRowControl.dataViewLabel', {
  defaultMessage: 'Edit document',
});

const editBackingDocumentLabel = i18n.translate('discover.editDocumentRowControl.esqlLabel', {
  defaultMessage: 'Edit backing document',
});

const openEditorForDocument = (record: DataTableRecord, deps: EditDocumentRowControlDeps): void => {
  const ref = getExpandedDocRef(record);
  if (!ref) {
    return;
  }
  void openIndexEditor({
    indexName: ref.index,
    filter: buildDocumentIdFilter([ref.id]),
    triggerSource: 'discover_row_action',
    ...deps,
  });
};

/**
 * A leading row control that opens the index editor scoped to the clicked document, so a single
 * Discover result can be edited in place. Shown only when the row has an editable `_id`/`_index`
 * identity (classic data views always do; ES|QL needs `METADATA _id, _index`) on a local,
 * non-reserved index. Write privilege is checked on click, falling back to a danger toast.
 */
export const createEditDocumentRowControl = (
  deps: EditDocumentRowControlDeps
): RowControlColumn => ({
  id: 'editDocument',
  isAvailable: ({ record }) => isDocumentEditable(record),
  render: (Control, { record }) => {
    const label = deps.isEsqlMode ? editBackingDocumentLabel : editDocumentLabel;
    return (
      <Control
        data-test-subj="discoverEditDocumentButton"
        label={label}
        tooltipContent={label}
        iconType="pencil"
        onClick={() => {
          openEditorForDocument(record, deps);
        }}
      />
    );
  },
});
