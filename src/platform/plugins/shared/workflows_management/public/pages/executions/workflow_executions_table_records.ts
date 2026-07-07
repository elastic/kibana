/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { flattenHit, getFlattenedFieldsComparator } from '@kbn/data-service';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataTableRecord, EsHitRecord } from '@kbn/discover-utils/types';

/**
 * Generates a stable id for an ES document. `_id` alone is not unique across indices/shard routing,
 * so the index and routing are included.
 */
const getDocId = (doc: EsHitRecord & { _routing?: string }): string => {
  const routing = doc._routing ? doc._routing : '';
  return [doc._index, doc._id, routing].join('::');
};

/**
 * Builds the `DataTableRecord`s consumed by `UnifiedDataTable` from raw ES hits.
 *
 * This is a workflows-local equivalent of `buildDataTableRecordList` from `@kbn/discover-utils`,
 * implemented directly on top of the lower-level `@kbn/data-service` utilities to avoid coupling the
 * executions view to the Discover package.
 */
export const buildWorkflowExecutionsTableRecords = ({
  records,
  dataView,
}: {
  records: EsHitRecord[];
  dataView?: DataView;
}): DataTableRecord[] => {
  const flattenedFieldsComparator = getFlattenedFieldsComparator(dataView);

  return records.map((doc) => ({
    id: getDocId(doc),
    raw: doc,
    flattened: flattenHit(doc, dataView, {
      includeIgnoredValues: true,
      flattenedFieldsComparator,
    }),
  }));
};
