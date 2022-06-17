/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { flattenHit } from '@kbn/data-plugin/common';
import { formatFieldValue } from './format_value';
import { convertValueToString } from './convert_value_to_string';
import type { DataTableRecord, EsHitRecord } from '../types';
import { getDocId } from './get_doc_id';

/**
 * Build a record for data table, explorer + classic one
 * @param hit the document returned from Elasticsearch
 * @param dataView this current data view
 * @param isAnchor determines if the given doc is the anchor doc when viewing surrounding documents
 */
export function buildDataTableRecord(
  hit: EsHitRecord,
  dataView: DataView,
  isAnchor?: boolean
): DataTableRecord {
  const flattened = flattenHit(hit, dataView, { includeIgnoredValues: true });
  const record: DataTableRecord = {
    id: getDocId(hit),
    raw: hit,
    flattened,
    isAnchor,
    renderFormatted: (fieldName: string) => {
      return formatFieldValue(fieldName, record, dataView);
    },
    renderText: (fieldName: string) => {
      return convertValueToString({
        columnId: fieldName,
        row: record,
        dataView,
        options: {
          disableMultiline: true,
        },
      });
    },
  };
  return record;
}
