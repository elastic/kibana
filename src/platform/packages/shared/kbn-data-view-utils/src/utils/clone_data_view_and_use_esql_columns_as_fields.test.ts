/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import { createEnrichedEsqlDataViewSpec } from './clone_data_view_and_use_esql_columns_as_fields';

describe('createEnrichedEsqlDataViewSpec', () => {
  const createBaseSpec = (): DataViewSpec => ({
    id: 'test-data-view',
    title: 'test-*',
    timeFieldName: '@timestamp',
    name: 'Test Data View',
  });

  it('should create enriched spec with ES|QL columns as fields', () => {
    const baseSpec = createBaseSpec();
    const esqlQueryColumns: DatatableColumn[] = [
      { id: 'message', name: 'message', meta: { type: 'string', esType: 'keyword' } },
      { id: 'count', name: 'count', meta: { type: 'number', esType: 'long' } },
    ];

    const enrichedSpec = createEnrichedEsqlDataViewSpec(baseSpec, esqlQueryColumns);

    expect(enrichedSpec.id).toBe('test-data-view');
    expect(enrichedSpec.title).toBe('test-*');
    expect(enrichedSpec.fields).toBeDefined();
    expect(Object.keys(enrichedSpec.fields!)).toEqual(['message', 'count']);
  });

  it('should handle empty columns array', () => {
    const baseSpec = createBaseSpec();
    const esqlQueryColumns: DatatableColumn[] = [];

    const enrichedSpec = createEnrichedEsqlDataViewSpec(baseSpec, esqlQueryColumns);

    expect(enrichedSpec.fields).toEqual({});
  });

  it('should mark computed fields', () => {
    const baseSpec = createBaseSpec();
    const esqlQueryColumns: DatatableColumn[] = [
      {
        id: 'computed_field',
        name: 'computed_field',
        meta: { type: 'number' },
        isComputedColumn: true,
      },
    ];

    const enrichedSpec = createEnrichedEsqlDataViewSpec(baseSpec, esqlQueryColumns);

    expect(enrichedSpec.fields!.computed_field.isComputedColumn).toBe(true);
  });
});
