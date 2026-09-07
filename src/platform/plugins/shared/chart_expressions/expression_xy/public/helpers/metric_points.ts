/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PointData } from './points';

const TIMESTAMP_FIELD = '@timestamp';

/**
 * Raw ES|QL response shape from `data.search.search()` with `strategy: 'esql'`.
 * The response body has `columns` (with `name` and `type`) and `values` (row arrays),
 * NOT the Datatable shape used elsewhere in Kibana.
 */
export interface EsqlRawResponse {
  columns: Array<{ name: string; type: string }>;
  values: Array<Array<unknown>>;
}

/**
 * Maps a raw ES|QL search response into the PointData shape expected by the
 * PointsLayer renderer.
 *
 * Expected columns:
 *   @timestamp  - ISO string or epoch ms (X axis)
 *   yAccessor   - numeric metric value (Y axis, column name declared by the layer)
 *   (any other columns become `details` key-value pairs)
 */
export function mapPointsResponse(raw: EsqlRawResponse, yAccessor: string): PointData[] {
  const { columns, values } = raw;

  const tsIdx = columns.findIndex((c) => c.name === TIMESTAMP_FIELD);
  const valueIdx = columns.findIndex((c) => c.name === yAccessor);

  if (tsIdx === -1 || valueIdx === -1) {
    return [];
  }

  const detailIndices = columns
    .map((col, idx) => ({ name: col.name, idx }))
    .filter(({ name }) => name !== TIMESTAMP_FIELD && name !== yAccessor);

  return values
    .map((row) => {
      const rawTs = row[tsIdx];
      const rawY = row[valueIdx];

      if (rawTs == null || rawY == null) {
        return null;
      }

      const x = typeof rawTs === 'number' ? rawTs : new Date(rawTs as string).getTime();
      const y = typeof rawY === 'number' ? rawY : parseFloat(String(rawY));

      if (isNaN(x) || isNaN(y)) {
        return null;
      }

      const details = detailIndices
        .map(({ name, idx }) => ({
          field: name,
          value: row[idx] != null ? String(row[idx]) : '',
        }))
        .filter((d) => d.value !== '');

      return { x, y, details };
    })
    .filter((p): p is PointData => p !== null);
}
