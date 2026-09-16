/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQL_TABLE_TYPE } from '@kbn/data-plugin/common';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { getTextBasedColumnsMeta } from '@kbn/unified-data-table';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { buildDatatableFromTextBasedGrid } from './build_datatable_from_text_based_grid';
import { getGridRequestId } from './get_grid_request_id';
import { getEsqlDatatableFromDocuments } from './get_esql_datatable_from_documents';
import { FetchStatus } from '../application/types';

const asEsqlRow = (id: string, raw: Record<string, unknown>): DataTableRecord =>
  ({ id, raw, flattened: raw } as unknown as DataTableRecord);

describe('buildDatatableFromTextBasedGrid', () => {
  it('preserves ES|QL column names for aliases and CHANGE_POINT BY columns', () => {
    const originalColumns: DatatableColumn[] = [
      { id: 'avg_bytes', name: 'avg_bytes', meta: { type: 'number' } },
      { id: 'host', name: 'host', meta: { type: 'string' } },
      { id: 'bucket', name: 'bucket', meta: { type: 'date' } },
      { id: 'type', name: 'type', meta: { type: 'string' } },
      { id: 'pvalue', name: 'pvalue', meta: { type: 'number' } },
    ];
    const columnsMeta = getTextBasedColumnsMeta(originalColumns);
    const rowData = {
      avg_bytes: 14,
      host: 'web-1',
      bucket: '2023-11-15T00:00:00.000Z',
      type: 'mean_shift',
      pvalue: 0.001,
    };
    const rows = [asEsqlRow('1', rowData)];

    const table = buildDatatableFromTextBasedGrid({ rows, columnsMeta });

    expect(table?.columns.map((column) => column.id)).toEqual(originalColumns.map((c) => c.id));
    expect(table?.columns.find((column) => column.id === 'avg_bytes')?.meta.type).toBe('number');
    expect(table?.columns.find((column) => column.id === 'host')?.meta.type).toBe('string');
    expect(table?.rows[0]).toEqual(rows[0].raw);
  });

  it('returns undefined when columnsMeta is missing or empty', () => {
    expect(buildDatatableFromTextBasedGrid({ rows: [], columnsMeta: undefined })).toBeUndefined();
    expect(buildDatatableFromTextBasedGrid({ rows: [], columnsMeta: {} })).toBeUndefined();
  });
});

describe('getGridRequestId', () => {
  it('returns the same id for the same result identity and a new id after refresh', () => {
    const first = [{ id: 'a' }];
    const second = [{ id: 'a' }];

    const firstId = getGridRequestId(first);
    expect(getGridRequestId(first)).toBe(firstId);
    expect(getGridRequestId(second)).not.toBe(firstId);
  });
});

describe('getEsqlDatatableFromDocuments', () => {
  it('supplies a table from a completed ES|QL result', () => {
    const columns: DatatableColumn[] = [{ id: 'bucket', name: 'bucket', meta: { type: 'date' } }];
    const result = [asEsqlRow('1', { bucket: '2023-11-15T00:00:00.000Z' })];

    const { table } = getEsqlDatatableFromDocuments({
      isEsqlMode: true,
      documentsValue: {
        fetchStatus: FetchStatus.COMPLETE,
        result,
        esqlQueryColumns: columns,
      },
    });

    expect(table?.type).toBe('datatable');
    expect(table?.meta).toEqual({ type: ESQL_TABLE_TYPE });
    expect(table?.columns).toEqual(columns);
    expect(table?.rows).toEqual([result[0].raw]);
  });

  it('does not supply a table while documents are still loading', () => {
    const { table } = getEsqlDatatableFromDocuments({
      isEsqlMode: true,
      documentsValue: {
        fetchStatus: FetchStatus.LOADING,
        result: [],
      },
    });

    expect(table).toBeUndefined();
  });
});
