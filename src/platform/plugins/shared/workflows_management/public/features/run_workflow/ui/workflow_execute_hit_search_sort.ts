/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsQuerySortValue } from '@kbn/data-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/public';
import { getSortForSearchSource } from '@kbn/discover-utils';
import type { SortOrder } from '@kbn/unified-data-table';

/** UI-only columns that are not indexed in Elasticsearch. */
const SYNTHETIC_SORT_FIELD_TO_ES: Record<string, string> = {
  document: '_doc',
  summary: '_doc',
};

export const DEFAULT_WORKFLOW_EXECUTE_HIT_SORT: SortOrder[] = [['@timestamp', 'desc']];

export function serializeWorkflowExecuteHitSortOrder(sort: SortOrder[]): string {
  const effectiveSort = sort.length > 0 ? sort : DEFAULT_WORKFLOW_EXECUTE_HIT_SORT;
  return effectiveSort.map(([field, direction]) => `${field}:${direction}`).join('|');
}

function mapSortOrderToEsFields(sort: SortOrder[]): SortOrder[] {
  return sort.map(([field, direction]) => {
    const esField = SYNTHETIC_SORT_FIELD_TO_ES[field] ?? field;
    return [esField, direction];
  });
}

export function buildWorkflowExecuteHitSearchEsSort(
  sort: SortOrder[],
  dataView?: DataView | null,
  defaultSortDir: string = 'desc'
): EsQuerySortValue[] {
  const effectiveSort = sort.length > 0 ? sort : DEFAULT_WORKFLOW_EXECUTE_HIT_SORT;
  const mappedSort = mapSortOrderToEsFields(effectiveSort);

  if (mappedSort.every(([field]) => field === '_doc')) {
    return mappedSort.map(([, direction]) => ({ _doc: direction } as EsQuerySortValue));
  }

  const dataViewSort = mappedSort.filter(([field]) => field !== '_doc');

  if (dataView && dataViewSort.length > 0) {
    return getSortForSearchSource({
      sort: dataViewSort,
      dataView,
      defaultSortDir,
      includeTieBreaker: true,
    });
  }

  if (dataView?.timeFieldName) {
    return getSortForSearchSource({
      sort: undefined,
      dataView,
      defaultSortDir,
      includeTieBreaker: false,
    });
  }

  return [{ _doc: defaultSortDir } as EsQuerySortValue];
}
