/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { DocumentEvent } from '@kbn/workflows';
import type { AlertSelection, AlertTriggerInput } from '../../../../common/types/alert_types';

export function buildAlertTriggerInputFromRecords(
  selectedRecords: DataTableRecord[]
): AlertTriggerInput | null {
  if (selectedRecords.length === 0) {
    return null;
  }

  const alertIds: AlertSelection[] = selectedRecords
    .map((record) => {
      const id = record.raw._id;
      const index = record.raw._index;
      if (!id || !index) {
        return null;
      }
      return { _id: id, _index: index };
    })
    .filter((entry): entry is AlertSelection => entry !== null);

  if (alertIds.length === 0) {
    return null;
  }

  return {
    event: {
      alertIds,
      triggerType: 'alert',
    },
  };
}

export interface DocumentTriggerEventPayload {
  event: DocumentEvent;
}

export function buildDocumentTriggerInputFromRecords(
  selectedRecords: DataTableRecord[],
  options: { submittedQuery: string; dataViewTitle: string | undefined }
): DocumentTriggerEventPayload | null {
  if (selectedRecords.length === 0) {
    return null;
  }

  const documents = selectedRecords.flatMap((record) => {
    const id = record.raw._id;
    const index = record.raw._index;
    if (!id || !index) {
      return [];
    }

    const data = (record.raw._source ?? {}) as Record<string, unknown>;
    const timestamp = data['@timestamp'];
    return [
      {
        ...data,
        _id: id,
        _index: index,
        id,
        index,
        ...(typeof timestamp === 'string' && { timestamp }),
        data,
      },
    ];
  });

  if (documents.length === 0) {
    return null;
  }

  return {
    event: {
      documents,
      query: options.submittedQuery,
      dataView: options.dataViewTitle,
    },
  };
}
