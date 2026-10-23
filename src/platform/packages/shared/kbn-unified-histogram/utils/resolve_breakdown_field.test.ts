/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataViewSource } from '@kbn/data-source';
import { createMockEsqlSource } from '@kbn/data-source/src/__mocks__/esql_source.mock';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { dataViewWithTimefieldMock } from '../__mocks__/data_view_with_timefield';
import { resolveBreakdownField } from './resolve_breakdown_field';

const dataViewSource = new DataViewSource(dataViewWithTimefieldMock);
const esqlSource = createMockEsqlSource();
const extensionColumn: DatatableColumn = {
  id: 'extension',
  name: 'extension',
  meta: { type: 'string' },
};

describe('resolveBreakdownField', () => {
  it('returns undefined when no breakdown field is set', () => {
    expect(
      resolveBreakdownField({
        breakdownField: undefined,
        dataSource: dataViewSource,
        columns: undefined,
      })
    ).toBeUndefined();
  });

  it('resolves a groupable data view field', () => {
    const field = resolveBreakdownField({
      breakdownField: 'extension',
      dataSource: dataViewSource,
      columns: undefined,
    });

    expect(field).toBe(dataViewWithTimefieldMock.getFieldByName('extension'));
  });

  it('drops a data view field that is not aggregatable', () => {
    expect(
      resolveBreakdownField({
        breakdownField: 'message',
        dataSource: dataViewSource,
        columns: undefined,
      })
    ).toBeUndefined();
  });

  it('builds a field from a groupable ES|QL result column', () => {
    const field = resolveBreakdownField({
      breakdownField: 'extension',
      dataSource: esqlSource,
      columns: [extensionColumn],
    });

    expect(field?.name).toBe('extension');
    expect(field?.displayName).toBe('extension');
  });

  it('drops an ES|QL column that is missing or not groupable', () => {
    expect(
      resolveBreakdownField({ breakdownField: 'extension', dataSource: esqlSource, columns: [] })
    ).toBeUndefined();
    expect(
      resolveBreakdownField({
        breakdownField: 'extension',
        dataSource: esqlSource,
        columns: [{ ...extensionColumn, meta: { type: 'unknown' } }],
      })
    ).toBeUndefined();
  });
});
