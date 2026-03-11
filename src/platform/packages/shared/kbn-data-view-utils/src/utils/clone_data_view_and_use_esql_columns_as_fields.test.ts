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
    expect(clonedDataView.shortDotsEnable).toBe(baseDataView.shortDotsEnable);
    expect(clonedDataView.fields.length).toBe(2);

    const messageField = clonedDataView.fields.getByName('message');
    expect(messageField?.type).toBe('string');
    expect(messageField?.esTypes).toEqual(['keyword']);

    const countField = clonedDataView.fields.getByName('count');
    expect(countField?.type).toBe('number');
    expect(countField?.esTypes).toEqual(['long']);
  });

  it('should reuse shortDotsEnable from base DataView', () => {
    const baseDataView = createBaseDataView(['_source', '_id'], true);
    const esqlQueryColumns: DatatableColumn[] = [
      { id: 'field', name: 'field', meta: { type: 'string' } },
    ];

    const clonedDataView = cloneDataViewAndUseEsqlColumnsAsFields(baseDataView, esqlQueryColumns, {
      fieldFormats: mockFieldFormats,
    });

    expect(clonedDataView.shortDotsEnable).toBe(true);
  });

  it('should reuse metaFields from base DataView', () => {
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

  it('should handle computed columns', () => {
    const baseDataView = createBaseDataView();
    const esqlQueryColumns: DatatableColumn[] = [
      {
        id: 'computed_field',
        name: 'computed_field',
        meta: { type: 'string', esType: 'keyword' },
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
    const baseDataView = new DataView({
      spec: {
        id: 'test-data-view',
        title: 'test-*',
        fields: {
          bytes: {
            name: 'bytes',
            type: 'number',
            esTypes: ['long'],
            searchable: true,
            aggregatable: true,
          },
        },
      },
      fieldFormats: mockFieldFormats,
      shortDotsEnable: false,
      metaFields: ['_source', '_id'],
    });

    // ES|QL returns bytes as keyword (type override)
    const esqlQueryColumns: DatatableColumn[] = [
      {
        id: 'bytes',
        name: 'bytes',
        meta: { type: 'string', esType: 'keyword' },
        isComputedColumn: false,
      },
    ];

    const clonedDataView = cloneDataViewAndUseEsqlColumnsAsFields(baseDataView, esqlQueryColumns, {
      fieldFormats: mockFieldFormats,
    });

    const bytesField = clonedDataView.fields.getByName('bytes');
    expect(bytesField?.type).toBe('string');
    expect(bytesField?.esTypes).toEqual(['keyword']);
  });

  it('should handle counter type metrics', () => {
    const baseDataView = createBaseDataView();
    const esqlQueryColumns: DatatableColumn[] = [
      {
        id: 'requests',
        name: 'requests',
        meta: { type: 'number', esType: 'counter_long' },
      },
    ];

    const clonedDataView = cloneDataViewAndUseEsqlColumnsAsFields(baseDataView, esqlQueryColumns, {
      fieldFormats: mockFieldFormats,
    });

    const requestsField = clonedDataView.fields.getByName('requests');
    expect(requestsField).toBeDefined();
    expect(requestsField?.esTypes).toEqual(['long']);
    expect(requestsField?.timeSeriesMetric).toBe('counter');
  });

  it('should handle columns without esType', () => {
    const baseDataView = createBaseDataView();
    const esqlQueryColumns: DatatableColumn[] = [
      {
        id: 'computed',
        name: 'computed',
        meta: { type: 'number' },
      },
    ];

    const clonedDataView = cloneDataViewAndUseEsqlColumnsAsFields(baseDataView, esqlQueryColumns, {
      fieldFormats: mockFieldFormats,
    });

    const computedField = clonedDataView.fields.getByName('computed');
    expect(computedField).toBeDefined();
    expect(computedField?.type).toBe('number');
    expect(computedField?.esTypes).toBeUndefined();
  });

  it('should handle mix of computed fields and index fields with type overrides', () => {
    const baseDataView = new DataView({
      spec: {
        id: 'test-data-view',
        title: 'test-*',
        fields: {
          message: {
            name: 'message',
            type: 'string',
            esTypes: ['keyword'],
            searchable: true,
            aggregatable: true,
          },
        },
      },
      fieldFormats: mockFieldFormats,
      shortDotsEnable: false,
      metaFields: ['_source', '_id'],
    });

    // ES|QL returns:
    // - message as text (type override)
    // - message_length as computed field
    const esqlQueryColumns: DatatableColumn[] = [
      {
        id: 'message',
        name: 'message',
        meta: { type: 'string', esType: 'text' },
        isComputedColumn: false,
      },
      {
        id: 'message_length',
        name: 'message_length',
        meta: { type: 'number', esType: 'long' },
        isComputedColumn: true,
      },
    ];

    const clonedDataView = cloneDataViewAndUseEsqlColumnsAsFields(baseDataView, esqlQueryColumns, {
      fieldFormats: mockFieldFormats,
    });

    expect(clonedDataView.fields.length).toBe(2);

    const messageField = clonedDataView.fields.getByName('message');
    expect(messageField).toBeDefined();
    expect(messageField?.type).toBe('string');
    expect(messageField?.esTypes).toEqual(['text']); // Overridden from keyword
    expect(messageField?.spec.isComputedColumn).toBe(false);

    const messageLengthField = clonedDataView.fields.getByName('message_length');
    expect(messageLengthField).toBeDefined();
    expect(messageLengthField?.type).toBe('number');
    expect(messageLengthField?.spec.isComputedColumn).toBe(true);
  });

  it('should preserve DataView metadata (id, title, timeFieldName)', () => {
    const baseDataView = new DataView({
      spec: {
        id: 'my-data-view-id',
        title: 'logs-*',
        timeFieldName: '@timestamp',
        name: 'My Logs',
      },
      fieldFormats: mockFieldFormats,
      shortDotsEnable: false,
      metaFields: ['_source'],
    });

    const esqlQueryColumns: DatatableColumn[] = [
      { id: '@timestamp', name: '@timestamp', meta: { type: 'date', esType: 'date' } },
      { id: 'message', name: 'message', meta: { type: 'string', esType: 'text' } },
    ];

    const clonedDataView = cloneDataViewAndUseEsqlColumnsAsFields(baseDataView, esqlQueryColumns, {
      fieldFormats: mockFieldFormats,
    });

    expect(clonedDataView.id).toBe('my-data-view-id');
    expect(clonedDataView.getIndexPattern()).toBe('logs-*');
    expect(clonedDataView.timeFieldName).toBe('@timestamp');
    expect(clonedDataView.name).toBe('My Logs');
  });
});
