/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { flattenHit } from '@kbn/data-plugin/common';
import { getDocId } from './get_doc_id';
import type { EsHitRecord } from '../application/types';
import type { DataTableRecord } from '../types';

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
