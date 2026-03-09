/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataView } from '@kbn/data-views-plugin/common';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { FieldFormatsStartCommon } from '@kbn/field-formats-plugin/common';
import { createEsqlDataViewWithColumns } from './create_esql_data_view_with_columns';

const mockFieldFormats = {
  getDefaultInstance: jest.fn(),
} as unknown as FieldFormatsStartCommon;

describe('createEsqlDataViewWithColumns', () => {
  const createBaseDataView = () =>
    new DataView({
      spec: {
        id: 'test-data-view',
        title: 'test-*',
        timeFieldName: '@timestamp',
        name: 'Test Data View',
      },
      fieldFormats: mockFieldFormats,
      shortDotsEnable: false,
      metaFields: ['_source', '_id'],
    });

  it('should create a new DataView with fields from esqlQueryColumns', () => {
    const baseDataView = createBaseDataView();
    const esqlQueryColumns: DatatableColumn[] = [
      { id: 'message', name: 'message', meta: { type: 'string', esType: 'keyword' } },
      { id: 'count', name: 'count', meta: { type: 'number', esType: 'long' } },
      { id: '@timestamp', name: '@timestamp', meta: { type: 'date', esType: 'date' } },
    ];

    const enrichedDataView = createEsqlDataViewWithColumns(baseDataView, esqlQueryColumns, {
      fieldFormats: mockFieldFormats,
      shortDotsEnable: false,
      metaFields: ['_source', '_id'],
    });

    expect(enrichedDataView.id).toBe(baseDataView.id);
    expect(enrichedDataView.getIndexPattern()).toBe(baseDataView.getIndexPattern());
    expect(enrichedDataView.timeFieldName).toBe(baseDataView.timeFieldName);
    expect(enrichedDataView.name).toBe(baseDataView.name);
    expect(enrichedDataView.fields.length).toBe(3);

    const messageField = enrichedDataView.fields.getByName('message');
    expect(messageField).toBeDefined();
    expect(messageField?.type).toBe('string');
    expect(messageField?.esTypes).toEqual(['keyword']);

    const countField = enrichedDataView.fields.getByName('count');
    expect(countField).toBeDefined();
    expect(countField?.type).toBe('number');
    expect(countField?.esTypes).toEqual(['long']);

    const timestampField = enrichedDataView.fields.getByName('@timestamp');
    expect(timestampField).toBeDefined();
    expect(timestampField?.type).toBe('date');
    expect(timestampField?.esTypes).toEqual(['date']);
  });

  it('should create a new DataView instance (not mutate the original)', () => {
    const baseDataView = createBaseDataView();
    const esqlQueryColumns: DatatableColumn[] = [
      { id: 'field1', name: 'field1', meta: { type: 'string' } },
    ];

    const enrichedDataView = createEsqlDataViewWithColumns(baseDataView, esqlQueryColumns, {
      fieldFormats: mockFieldFormats,
      shortDotsEnable: false,
      metaFields: ['_source', '_id'],
    });

    expect(enrichedDataView).not.toBe(baseDataView);
  });

  it('should handle columns with counter type metrics', () => {
    const baseDataView = createBaseDataView();
    const esqlQueryColumns: DatatableColumn[] = [
      { id: 'requests', name: 'requests', meta: { type: 'number', esType: 'counter_long' } },
    ];

    const enrichedDataView = createEsqlDataViewWithColumns(baseDataView, esqlQueryColumns, {
      fieldFormats: mockFieldFormats,
      shortDotsEnable: false,
      metaFields: ['_source', '_id'],
    });

    const requestsField = enrichedDataView.fields.getByName('requests');
    expect(requestsField).toBeDefined();
    expect(requestsField?.esTypes).toEqual(['long']);
    expect(requestsField?.timeSeriesMetric).toBe('counter');
  });

  it('should handle empty esqlQueryColumns', () => {
    const baseDataView = createBaseDataView();
    const esqlQueryColumns: DatatableColumn[] = [];

    const enrichedDataView = createEsqlDataViewWithColumns(baseDataView, esqlQueryColumns, {
      fieldFormats: mockFieldFormats,
      shortDotsEnable: false,
      metaFields: ['_source', '_id'],
    });

    expect(enrichedDataView.fields.length).toBe(0);
  });

  it('should handle columns without esType', () => {
    const baseDataView = createBaseDataView();
    const esqlQueryColumns: DatatableColumn[] = [
      { id: 'computed', name: 'computed', meta: { type: 'number' } },
    ];

    const enrichedDataView = createEsqlDataViewWithColumns(baseDataView, esqlQueryColumns, {
      fieldFormats: mockFieldFormats,
      shortDotsEnable: false,
      metaFields: ['_source', '_id'],
    });

    const computedField = enrichedDataView.fields.getByName('computed');
    expect(computedField).toBeDefined();
    expect(computedField?.type).toBe('number');
    expect(computedField?.esTypes).toBeUndefined();
  });

  it('should mark fields as computed columns', () => {
    const baseDataView = createBaseDataView();
    const esqlQueryColumns: DatatableColumn[] = [
      { id: 'field1', name: 'field1', meta: { type: 'string' } },
    ];

    const enrichedDataView = createEsqlDataViewWithColumns(baseDataView, esqlQueryColumns, {
      fieldFormats: mockFieldFormats,
      shortDotsEnable: false,
      metaFields: ['_source', '_id'],
    });

    const field = enrichedDataView.fields.getByName('field1');
    expect(field?.spec.isComputedColumn).toBe(true);
  });
});
