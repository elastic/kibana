/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQL_TABLE_TYPE } from '@kbn/data-plugin/common';
import type { DataTableRecord } from '@kbn/discover-utils';
import { FetchStatus } from '../application/types';
import { getEsqlDatatableFromDocuments } from './get_esql_datatable_from_documents';

const baseColumns = [{ id: 'maxB', name: 'maxB', meta: { type: 'number' as const } }];
const baseResult = [
  { id: 'r1', raw: { maxB: 100 }, flattened: { maxB: 100 } },
] as unknown as DataTableRecord[];

const completeMsg = (approximationApplied?: boolean) => ({
  fetchStatus: FetchStatus.COMPLETE,
  result: baseResult,
  esqlQueryColumns: baseColumns,
  approximationApplied,
});

describe('getEsqlDatatableFromDocuments', () => {
  it('returns undefined table when isEsqlMode is false', () => {
    const { table } = getEsqlDatatableFromDocuments({
      documentsValue: completeMsg(true),
      isEsqlMode: false,
    });
    expect(table).toBeUndefined();
  });

  it('returns undefined table when fetchStatus is LOADING', () => {
    const { table } = getEsqlDatatableFromDocuments({
      documentsValue: { fetchStatus: FetchStatus.LOADING, result: baseResult },
      isEsqlMode: true,
    });
    expect(table).toBeUndefined();
  });

  it('returns undefined table when documentsValue is undefined', () => {
    const { table } = getEsqlDatatableFromDocuments({
      documentsValue: undefined,
      isEsqlMode: true,
    });
    expect(table).toBeUndefined();
  });

  it('sets approximationApplied: true in table meta', () => {
    const { table } = getEsqlDatatableFromDocuments({
      documentsValue: completeMsg(true),
      isEsqlMode: true,
    });
    expect(table?.meta).toEqual({ type: ESQL_TABLE_TYPE, approximationApplied: true });
  });

  it('sets approximationApplied: false in table meta', () => {
    const { table } = getEsqlDatatableFromDocuments({
      documentsValue: completeMsg(false),
      isEsqlMode: true,
    });
    expect(table?.meta).toEqual({ type: ESQL_TABLE_TYPE, approximationApplied: false });
  });

  it('sets approximationApplied: undefined when not present in documentsValue', () => {
    const { table } = getEsqlDatatableFromDocuments({
      documentsValue: completeMsg(undefined),
      isEsqlMode: true,
    });
    expect(table?.meta).toEqual({ type: ESQL_TABLE_TYPE, approximationApplied: undefined });
  });

  it('maps rows from result.raw', () => {
    const { table } = getEsqlDatatableFromDocuments({
      documentsValue: completeMsg(true),
      isEsqlMode: true,
    });
    expect(table?.rows).toEqual([{ maxB: 100 }]);
  });

  it('uses esqlQueryColumns as table columns', () => {
    const { table } = getEsqlDatatableFromDocuments({
      documentsValue: completeMsg(true),
      isEsqlMode: true,
    });
    expect(table?.columns).toEqual(baseColumns);
  });
});
