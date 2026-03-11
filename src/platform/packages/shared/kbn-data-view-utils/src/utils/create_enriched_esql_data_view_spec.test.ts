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
import { createEnrichedEsqlDataViewSpec } from './create_enriched_esql_data_view_spec';

describe('createEnrichedEsqlDataViewSpec', () => {
  const baseSpec: DataViewSpec = {
    id: 'test-pattern',
    title: 'test-*',
    timeFieldName: '@timestamp',
    fields: {
      existingField: {
        name: 'existingField',
        type: 'string',
        esTypes: ['keyword'],
        searchable: true,
        aggregatable: true,
      },
    },
  };

  it('should create enriched spec with ES|QL columns as fields', () => {
    const esqlColumns: DatatableColumn[] = [
      {
        id: 'message',
        name: 'message',
        meta: { type: 'string', esType: 'keyword' },
        isNull: false,
      },
      {
        id: 'count',
        name: 'count',
        meta: { type: 'number', esType: 'long' },
        isNull: false,
      },
    ];

    const result = createEnrichedEsqlDataViewSpec(baseSpec, esqlColumns);

    expect(result.id).toBe('test-pattern');
    expect(result.title).toBe('test-*');
    expect(result.timeFieldName).toBe('@timestamp');
    expect(result.fields).toBeDefined();
    expect(Object.keys(result.fields!)).toEqual(['message', 'count']);
    expect(result.fields!.message).toMatchObject({
      name: 'message',
      type: 'string',
      esTypes: ['keyword'],
    });
    expect(result.fields!.count).toMatchObject({
      name: 'count',
      type: 'number',
      esTypes: ['long'],
    });
  });

  it('should replace all original fields with ES|QL columns', () => {
    const esqlColumns: DatatableColumn[] = [
      {
        id: 'newField',
        name: 'newField',
        meta: { type: 'string', esType: 'text' },
        isNull: false,
      },
    ];

    const result = createEnrichedEsqlDataViewSpec(baseSpec, esqlColumns);

    expect(result.fields).toBeDefined();
    expect(Object.keys(result.fields!)).toEqual(['newField']);
    expect(result.fields!.existingField).toBeUndefined();
  });

  it('should handle empty columns array', () => {
    const result = createEnrichedEsqlDataViewSpec(baseSpec, []);

    expect(result.fields).toEqual({});
  });

  it('should mark computed fields with isComputedColumn', () => {
    const esqlColumns: DatatableColumn[] = [
      {
        id: 'computed',
        name: 'computed',
        meta: { type: 'number', esType: 'double' },
        isNull: false,
        isComputedColumn: true,
      },
    ];

    const result = createEnrichedEsqlDataViewSpec(baseSpec, esqlColumns);

    expect(result.fields).toBeDefined();
    expect(result.fields!.computed.isComputedColumn).toBe(true);
  });

  it('should handle type overrides from ES|QL', () => {
    const esqlColumns: DatatableColumn[] = [
      {
        id: 'price',
        name: 'price',
        meta: { type: 'string', esType: 'keyword' },
        isNull: false,
      },
    ];

    const result = createEnrichedEsqlDataViewSpec(baseSpec, esqlColumns);

    expect(result.fields).toBeDefined();
    expect(result.fields!.price.type).toBe('string');
    expect(result.fields!.price.esTypes).toEqual(['keyword']);
  });

  it('should handle text field type', () => {
    const esqlColumns: DatatableColumn[] = [
      {
        id: 'description',
        name: 'description',
        meta: { type: 'string', esType: 'text' },
        isNull: false,
      },
    ];

    const result = createEnrichedEsqlDataViewSpec(baseSpec, esqlColumns);

    expect(result.fields).toBeDefined();
    expect(result.fields!.description.type).toBe('string');
    expect(result.fields!.description.esTypes).toEqual(['text']);
  });

  it('should preserve base spec properties', () => {
    const complexBaseSpec: DataViewSpec = {
      ...baseSpec,
      sourceFilters: [{ value: 'secret_*' }],
      fieldFormats: {
        bytes: { id: 'bytes' },
      },
      runtimeFieldMap: {
        runtime_field: {
          type: 'keyword',
          script: { source: 'emit("test")' },
        },
      },
      allowNoIndex: true,
      namespaces: ['default'],
    };

    const esqlColumns: DatatableColumn[] = [
      {
        id: 'test',
        name: 'test',
        meta: { type: 'string', esType: 'keyword' },
        isNull: false,
      },
    ];

    const result = createEnrichedEsqlDataViewSpec(complexBaseSpec, esqlColumns);

    expect(result.sourceFilters).toEqual([{ value: 'secret_*' }]);
    expect(result.fieldFormats).toEqual({ bytes: { id: 'bytes' } });
    expect(result.runtimeFieldMap).toEqual({
      runtime_field: {
        type: 'keyword',
        script: { source: 'emit("test")' },
      },
    });
    expect(result.allowNoIndex).toBe(true);
    expect(result.namespaces).toEqual(['default']);
  });

  it('should handle IP field type', () => {
    const esqlColumns: DatatableColumn[] = [
      {
        id: 'client_ip',
        name: 'client_ip',
        meta: { type: 'ip', esType: 'ip' },
        isNull: false,
      },
    ];

    const result = createEnrichedEsqlDataViewSpec(baseSpec, esqlColumns);

    expect(result.fields).toBeDefined();
    expect(result.fields!.client_ip.type).toBe('ip');
    expect(result.fields!.client_ip.esTypes).toEqual(['ip']);
  });

  it('should handle date field type', () => {
    const esqlColumns: DatatableColumn[] = [
      {
        id: '@timestamp',
        name: '@timestamp',
        meta: { type: 'date', esType: 'date' },
        isNull: false,
      },
    ];

    const result = createEnrichedEsqlDataViewSpec(baseSpec, esqlColumns);

    expect(result.fields).toBeDefined();
    expect(result.fields!['@timestamp'].type).toBe('date');
    expect(result.fields!['@timestamp'].esTypes).toEqual(['date']);
  });

  it('should handle boolean field type', () => {
    const esqlColumns: DatatableColumn[] = [
      {
        id: 'is_active',
        name: 'is_active',
        meta: { type: 'boolean', esType: 'boolean' },
        isNull: false,
      },
    ];

    const result = createEnrichedEsqlDataViewSpec(baseSpec, esqlColumns);

    expect(result.fields).toBeDefined();
    expect(result.fields!.is_active.type).toBe('boolean');
    expect(result.fields!.is_active.esTypes).toEqual(['boolean']);
  });
});
