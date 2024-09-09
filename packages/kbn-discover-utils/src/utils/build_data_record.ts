/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import { flattenHit } from '@kbn/data-service';
import type { DataTableRecord, EsHitRecord } from '../types';
import { getDocId } from './get_doc_id';

/**
 * Build a record for data table, explorer + classic one
 * @param doc the document returned from Elasticsearch
 * @param dataView this current data view
 * @param isAnchor determines if the given doc is the anchor doc when viewing surrounding documents
 */
export function buildDataTableRecord(
  doc: EsHitRecord,
  dataView?: DataView,
  isAnchor?: boolean
): DataTableRecord {
  return {
    id: getDocId(doc),
    raw: doc,
    flattened: flattenHit(doc, dataView, { includeIgnoredValues: true }),
    isAnchor,
  };
}

/**
 * Helper to build multiple DataTableRecords at once, saved a bit of testing code lines
 * @param records Array of documents returned from Elasticsearch
 * @param dataView this current data view
 */
export function buildDataTableRecordList<T extends DataTableRecord = DataTableRecord>({
  records,
  dataView,
  processRecord,
}: {
  records: EsHitRecord[];
  dataView?: DataView;
  processRecord?: (record: DataTableRecord) => T;
}): DataTableRecord[] {
  return records.map((doc) => {
    const record = buildDataTableRecord(doc, dataView);
    return processRecord ? processRecord(record) : record;
  });
}
