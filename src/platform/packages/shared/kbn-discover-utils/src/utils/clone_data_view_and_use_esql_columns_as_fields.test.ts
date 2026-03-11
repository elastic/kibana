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
import { cloneDataViewAndUseEsqlColumnsAsFields } from './clone_data_view_and_use_esql_columns_as_fields';

const mockFieldFormats = {
  getDefaultInstance: jest.fn(),
} as unknown as FieldFormatsStartCommon;

describe('cloneDataViewAndUseEsqlColumnsAsFields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createBaseDataView = (metaFields = ['_source', '_id'], shortDotsEnable = false) =>
    new DataView({
      spec: {
        id: 'test-data-view',
        title: 'test-*',
        timeFieldName: '@timestamp',
        name: 'Test Data View',
      },
      fieldFormats: mockFieldFormats,
      shortDotsEnable,
      metaFields,
    });

  it('should clone DataView and replace fields with ES|QL columns', () => {
    const baseDataView = createBaseDataView();
    const esqlQueryColumns: DatatableColumn[] = [
      { id: 'message', name: 'message', meta: { type: 'string', esType: 'keyword' } },
      { id: 'count', name: 'count', meta: { type: 'number', esType: 'long' } },
    ];

    const clonedDataView = cloneDataViewAndUseEsqlColumnsAsFields(baseDataView, esqlQueryColumns, {
      fieldFormats: mockFieldFormats,
    });

    expect(clonedDataView.id).toBe(baseDataView.id);
    expect(clonedDataView.getIndexPattern()).toBe(baseDataView.getIndexPattern());
    expect(clonedDataView.metaFields).toEqual(baseDataView.metaFields);

    // Should have exactly 2 fields from ES|QL columns
    expect(clonedDataView.fields.length).toBe(2);
    expect(clonedDataView.fields.getByName('message')).toBeDefined();
    expect(clonedDataView.fields.getByName('count')).toBeDefined();
  });

  it('should preserve shortDotsEnable setting', () => {
    const baseDataView = createBaseDataView(undefined, true);
    const esqlQueryColumns: DatatableColumn[] = [
      { id: 'field', name: 'field', meta: { type: 'string' } },
    ];

    const clonedDataView = cloneDataViewAndUseEsqlColumnsAsFields(baseDataView, esqlQueryColumns, {
      fieldFormats: mockFieldFormats,
    });

    expect(clonedDataView.shortDotsEnable).toBe(true);
  });

  it('should preserve metaFields', () => {
    const baseDataView = createBaseDataView(['_source', '_id', '_index', 'custom_meta']);
    const esqlQueryColumns: DatatableColumn[] = [
      { id: 'field', name: 'field', meta: { type: 'string' } },
    ];

    const clonedDataView = cloneDataViewAndUseEsqlColumnsAsFields(baseDataView, esqlQueryColumns, {
      fieldFormats: mockFieldFormats,
    });

    expect(clonedDataView.metaFields).toEqual(['_source', '_id', '_index', 'custom_meta']);
  });

  it('should handle empty columns array', () => {
    const baseDataView = createBaseDataView();
    const esqlQueryColumns: DatatableColumn[] = [];

    const clonedDataView = cloneDataViewAndUseEsqlColumnsAsFields(baseDataView, esqlQueryColumns, {
      fieldFormats: mockFieldFormats,
    });

    expect(clonedDataView.fields.length).toBe(0);
  });

  it('should create a new DataView instance', () => {
    const baseDataView = createBaseDataView();
    const esqlQueryColumns: DatatableColumn[] = [
      { id: 'field', name: 'field', meta: { type: 'string' } },
    ];

    const clonedDataView = cloneDataViewAndUseEsqlColumnsAsFields(baseDataView, esqlQueryColumns, {
      fieldFormats: mockFieldFormats,
    });

    expect(clonedDataView).not.toBe(baseDataView);
  });

  it('should mark computed fields with isComputedColumn', () => {
    const baseDataView = createBaseDataView();
    const esqlQueryColumns: DatatableColumn[] = [
      {
        id: 'computed_field',
        name: 'computed_field',
        meta: { type: 'number' },
        isComputedColumn: true,
      },
    ];

    const clonedDataView = cloneDataViewAndUseEsqlColumnsAsFields(baseDataView, esqlQueryColumns, {
      fieldFormats: mockFieldFormats,
    });

    const field = clonedDataView.fields.getByName('computed_field');
    expect(field?.spec.isComputedColumn).toBe(true);
  });

  it('should handle type overrides from ES|QL', () => {
    const baseDataView = createBaseDataView();
    const esqlQueryColumns: DatatableColumn[] = [
      {
        id: 'bytes',
        name: 'bytes',
        meta: {
          type: 'string',
          esType: 'keyword',
        },
      },
    ];

    const clonedDataView = cloneDataViewAndUseEsqlColumnsAsFields(baseDataView, esqlQueryColumns, {
      fieldFormats: mockFieldFormats,
    });

    const bytesField = clonedDataView.fields.getByName('bytes');
    expect(bytesField?.type).toBe('string');
    expect(bytesField?.esTypes).toEqual(['keyword']);
  });

  it('should handle fields not in original DataView', () => {
    const baseDataView = createBaseDataView();
    const esqlQueryColumns: DatatableColumn[] = [
      {
        id: 'requests',
        name: 'requests',
        meta: {
          type: 'number',
        },
      },
    ];

    const clonedDataView = cloneDataViewAndUseEsqlColumnsAsFields(baseDataView, esqlQueryColumns, {
      fieldFormats: mockFieldFormats,
    });

    const requestsField = clonedDataView.fields.getByName('requests');
    expect(requestsField).toBeDefined();
    expect(requestsField?.type).toBe('number');
  });

  it('should mark non-computed fields correctly', () => {
    const baseDataView = createBaseDataView();
    const esqlQueryColumns: DatatableColumn[] = [
      {
        id: 'computed',
        name: 'computed',
        meta: { type: 'number' },
        isComputedColumn: true,
      },
      {
        id: 'regular',
        name: 'regular',
        meta: { type: 'string' },
        // No isComputedColumn property
      },
    ];

    const clonedDataView = cloneDataViewAndUseEsqlColumnsAsFields(baseDataView, esqlQueryColumns, {
      fieldFormats: mockFieldFormats,
    });

    expect(clonedDataView.fields.length).toBe(2);

    const computedField = clonedDataView.fields.getByName('computed');
    expect(computedField?.spec.isComputedColumn).toBe(true);

    const regularField = clonedDataView.fields.getByName('regular');
    expect(regularField?.spec.isComputedColumn).toBe(false);
  });

  it('should handle multiple ES types', () => {
    const baseDataView = createBaseDataView();
    const esqlQueryColumns: DatatableColumn[] = [
      {
        id: 'multi_field',
        name: 'multi_field',
        meta: {
          type: 'string',
          esType: 'text',
        },
      },
      {
        id: 'multi_field.keyword',
        name: 'multi_field.keyword',
        meta: {
          type: 'string',
          esType: 'keyword',
        },
      },
    ];

    const clonedDataView = cloneDataViewAndUseEsqlColumnsAsFields(baseDataView, esqlQueryColumns, {
      fieldFormats: mockFieldFormats,
    });

    expect(clonedDataView.fields.length).toBe(2);

    const textField = clonedDataView.fields.getByName('multi_field');
    expect(textField?.esTypes).toEqual(['text']);

    const keywordField = clonedDataView.fields.getByName('multi_field.keyword');
    expect(keywordField?.esTypes).toEqual(['keyword']);
  });

  it('should preserve all DataView metadata', () => {
    const baseDataView = createBaseDataView();
    const esqlQueryColumns: DatatableColumn[] = [
      { id: 'message', name: 'message', meta: { type: 'string', esType: 'text' } },
    ];

    const clonedDataView = cloneDataViewAndUseEsqlColumnsAsFields(baseDataView, esqlQueryColumns, {
      fieldFormats: mockFieldFormats,
    });

    expect(clonedDataView.id).toBe('test-data-view');
    expect(clonedDataView.getIndexPattern()).toBe('test-*');
    expect(clonedDataView.timeFieldName).toBe('@timestamp');
    expect(clonedDataView.name).toBe('Test Data View');
  });
});
