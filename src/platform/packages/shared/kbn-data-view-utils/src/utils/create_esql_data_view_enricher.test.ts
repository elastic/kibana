/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { DatatableColumn, DatatableColumnType } from '@kbn/expressions-plugin/common';
import { createEsqlDataViewEnricher } from './create_esql_data_view_enricher';

describe('createEsqlDataViewEnricher', () => {
  const createMockDataView = (id: string, timeFieldName?: string): DataView => {
    const mockDataView = {
      id,
      timeFieldName,
      cloneWithFields: jest.fn((fields) => {
        // Mimic the real cloneWithFields behavior: clear timeFieldName if time field not in fields
        const clonedTimeFieldName =
          timeFieldName && fields[timeFieldName] ? timeFieldName : undefined;
        return {
          ...mockDataView,
          id,
          fields,
          timeFieldName: clonedTimeFieldName,
          isCloned: true,
        };
      }),
    } as unknown as DataView;
    return mockDataView;
  };

  const createColumns = (
    fields: Array<{ name: string; type: DatatableColumnType; esType?: string }>
  ): DatatableColumn[] => {
    return fields.map((field) => ({
      id: field.name,
      name: field.name,
      meta: {
        type: field.type,
        esType: field.esType,
      },
    }));
  };

  it('should return undefined for empty columns', () => {
    const enricher = createEsqlDataViewEnricher();
    const mockDataView = createMockDataView('test-id');

    expect(enricher.enrich(mockDataView, [])).toBeUndefined();
    expect(enricher.enrich(mockDataView, undefined)).toBeUndefined();
    expect(mockDataView.cloneWithFields).not.toHaveBeenCalled();
  });

  it('should create enriched DataView for valid columns', () => {
    const enricher = createEsqlDataViewEnricher();
    const mockDataView = createMockDataView('test-id');
    const columns = createColumns([{ name: 'field1', type: 'string', esType: 'keyword' }]);

    const result = enricher.enrich(mockDataView, columns);

    expect(result).toBeDefined();
    expect(mockDataView.cloneWithFields).toHaveBeenCalledTimes(1);
    expect(mockDataView.cloneWithFields).toHaveBeenCalledWith({
      field1: expect.objectContaining({
        name: 'field1',
        type: 'string',
        esTypes: ['keyword'],
      }),
    });
  });

  it('should reuse cached DataView when columns are unchanged', () => {
    const enricher = createEsqlDataViewEnricher();
    const mockDataView = createMockDataView('test-id');
    const columns = createColumns([{ name: 'field1', type: 'string', esType: 'keyword' }]);

    const first = enricher.enrich(mockDataView, columns);
    const second = enricher.enrich(mockDataView, columns);

    expect(first).toBe(second);
    expect(mockDataView.cloneWithFields).toHaveBeenCalledTimes(1);
  });

  it('should reuse cached DataView when columns have same signature but different reference', () => {
    const enricher = createEsqlDataViewEnricher();
    const mockDataView = createMockDataView('test-id');
    const columns1 = createColumns([{ name: 'field1', type: 'string', esType: 'keyword' }]);
    const columns2 = createColumns([{ name: 'field1', type: 'string', esType: 'keyword' }]);

    const first = enricher.enrich(mockDataView, columns1);
    const second = enricher.enrich(mockDataView, columns2);

    expect(first).toBe(second);
    expect(mockDataView.cloneWithFields).toHaveBeenCalledTimes(1);
  });

  it('should create new DataView when column names change', () => {
    const enricher = createEsqlDataViewEnricher();
    const mockDataView = createMockDataView('test-id');
    const columns1 = createColumns([{ name: 'field1', type: 'string' }]);
    const columns2 = createColumns([{ name: 'field2', type: 'string' }]);

    const first = enricher.enrich(mockDataView, columns1);
    const second = enricher.enrich(mockDataView, columns2);

    expect(first).not.toBe(second);
    expect(mockDataView.cloneWithFields).toHaveBeenCalledTimes(2);
  });

  it('should create new DataView when column types change', () => {
    const enricher = createEsqlDataViewEnricher();
    const mockDataView = createMockDataView('test-id');
    const columns1 = createColumns([{ name: 'field1', type: 'string' }]);
    const columns2 = createColumns([{ name: 'field1', type: 'number' }]);

    const first = enricher.enrich(mockDataView, columns1);
    const second = enricher.enrich(mockDataView, columns2);

    expect(first).not.toBe(second);
    expect(mockDataView.cloneWithFields).toHaveBeenCalledTimes(2);
  });

  it('should create new DataView when column esTypes change', () => {
    const enricher = createEsqlDataViewEnricher();
    const mockDataView = createMockDataView('test-id');
    const columns1 = createColumns([{ name: 'field1', type: 'string', esType: 'keyword' }]);
    const columns2 = createColumns([{ name: 'field1', type: 'string', esType: 'text' }]);

    const first = enricher.enrich(mockDataView, columns1);
    const second = enricher.enrich(mockDataView, columns2);

    expect(first).not.toBe(second);
    expect(mockDataView.cloneWithFields).toHaveBeenCalledTimes(2);
  });

  it('should create new DataView when column count changes', () => {
    const enricher = createEsqlDataViewEnricher();
    const mockDataView = createMockDataView('test-id');
    const columns1 = createColumns([{ name: 'field1', type: 'string' }]);
    const columns2 = createColumns([
      { name: 'field1', type: 'string' },
      { name: 'field2', type: 'number' },
    ]);

    const first = enricher.enrich(mockDataView, columns1);
    const second = enricher.enrich(mockDataView, columns2);

    expect(first).not.toBe(second);
    expect(mockDataView.cloneWithFields).toHaveBeenCalledTimes(2);
  });

  it('should invalidate cache when base DataView changes', () => {
    const enricher = createEsqlDataViewEnricher();
    const mockDataView1 = createMockDataView('test-id-1');
    const mockDataView2 = createMockDataView('test-id-2');
    const columns = createColumns([{ name: 'field1', type: 'string' }]);

    const first = enricher.enrich(mockDataView1, columns);
    const second = enricher.enrich(mockDataView2, columns);

    expect(first).not.toBe(second);
    expect(mockDataView1.cloneWithFields).toHaveBeenCalledTimes(1);
    expect(mockDataView2.cloneWithFields).toHaveBeenCalledTimes(1);
  });

  it('should clear cache on clear()', () => {
    const enricher = createEsqlDataViewEnricher();
    const mockDataView = createMockDataView('test-id');
    const columns = createColumns([{ name: 'field1', type: 'string' }]);

    enricher.enrich(mockDataView, columns);
    enricher.clear();
    enricher.enrich(mockDataView, columns);

    expect(mockDataView.cloneWithFields).toHaveBeenCalledTimes(2);
  });

  it('should handle columns with missing meta fields gracefully', () => {
    const enricher = createEsqlDataViewEnricher();
    const mockDataView = createMockDataView('test-id');
    const columns: DatatableColumn[] = [
      { id: 'field1', name: 'field1', meta: { type: 'string' } },
      { id: 'field2', name: 'field2', meta: {} as DatatableColumn['meta'] },
    ];

    const result = enricher.enrich(mockDataView, columns);

    expect(result).toBeDefined();
    expect(mockDataView.cloneWithFields).toHaveBeenCalledTimes(1);
  });

  it('should produce consistent signature regardless of column order', () => {
    const enricher = createEsqlDataViewEnricher();
    const mockDataView = createMockDataView('test-id');
    const columns1 = createColumns([
      { name: 'field1', type: 'string' },
      { name: 'field2', type: 'number' },
    ]);
    const columns2 = createColumns([
      { name: 'field2', type: 'number' },
      { name: 'field1', type: 'string' },
    ]);

    const first = enricher.enrich(mockDataView, columns1);
    const second = enricher.enrich(mockDataView, columns2);

    expect(first).toBe(second);
    expect(mockDataView.cloneWithFields).toHaveBeenCalledTimes(1);
  });

  it('should create independent instances with separate caches', () => {
    const enricher1 = createEsqlDataViewEnricher();
    const enricher2 = createEsqlDataViewEnricher();
    const mockDataView = createMockDataView('test-id');
    const columns = createColumns([{ name: 'field1', type: 'string' }]);

    const result1 = enricher1.enrich(mockDataView, columns);
    const result2 = enricher2.enrich(mockDataView, columns);

    expect(result1).not.toBe(result2);
    expect(mockDataView.cloneWithFields).toHaveBeenCalledTimes(2);
  });

  describe('time field handling', () => {
    it('should clear timeFieldName when time field not in ES|QL columns', () => {
      const enricher = createEsqlDataViewEnricher();
      const mockDataView = createMockDataView('test-id', '@timestamp');
      const columns = createColumns([{ name: 'field1', type: 'string' }]);

      const result = enricher.enrich(mockDataView, columns);

      expect(result?.timeFieldName).toBeUndefined();
      expect(mockDataView.cloneWithFields).toHaveBeenCalledWith({
        field1: expect.objectContaining({ name: 'field1' }),
      });
    });

    it('should preserve timeFieldName when time field is in ES|QL columns', () => {
      const enricher = createEsqlDataViewEnricher();
      const mockDataView = createMockDataView('test-id', '@timestamp');
      const columns = createColumns([
        { name: 'field1', type: 'string' },
        { name: '@timestamp', type: 'date', esType: 'date' },
      ]);

      const result = enricher.enrich(mockDataView, columns);

      expect(result?.timeFieldName).toBe('@timestamp');
      expect(mockDataView.cloneWithFields).toHaveBeenCalledWith(
        expect.objectContaining({
          '@timestamp': expect.objectContaining({
            name: '@timestamp',
            esTypes: ['date'],
          }),
        })
      );
    });

    it('should not modify timeFieldName when base DataView has no time field', () => {
      const enricher = createEsqlDataViewEnricher();
      const mockDataView = createMockDataView('test-id');
      const columns = createColumns([{ name: 'field1', type: 'string' }]);

      const result = enricher.enrich(mockDataView, columns);

      expect(result?.timeFieldName).toBeUndefined();
      expect(mockDataView.cloneWithFields).toHaveBeenCalledWith({
        field1: expect.objectContaining({ name: 'field1' }),
      });
    });

    it('should handle different time field types correctly', () => {
      const enricher = createEsqlDataViewEnricher();
      const mockDataView = createMockDataView('test-id', '@timestamp');
      const columns = createColumns([
        { name: 'field1', type: 'string' },
        { name: '@timestamp', type: 'date', esType: 'date_nanos' },
      ]);

      const result = enricher.enrich(mockDataView, columns);

      expect(result?.timeFieldName).toBe('@timestamp');
      expect(mockDataView.cloneWithFields).toHaveBeenCalledWith(
        expect.objectContaining({
          '@timestamp': expect.objectContaining({
            name: '@timestamp',
            esTypes: ['date_nanos'],
          }),
        })
      );
    });

    it('should invalidate cache when time field presence changes', () => {
      const enricher = createEsqlDataViewEnricher();
      const mockDataView = createMockDataView('test-id', '@timestamp');

      // First: columns without time field
      const columnsWithoutTime = createColumns([{ name: 'field1', type: 'string' }]);
      const firstResult = enricher.enrich(mockDataView, columnsWithoutTime);

      // Second: same columns but now WITH time field - should recreate
      const columnsWithTime = createColumns([
        { name: 'field1', type: 'string' },
        { name: '@timestamp', type: 'date', esType: 'date' },
      ]);
      const secondResult = enricher.enrich(mockDataView, columnsWithTime);

      expect(firstResult?.timeFieldName).toBeUndefined();
      expect(secondResult?.timeFieldName).toBe('@timestamp');
      expect(firstResult).not.toBe(secondResult);
      expect(mockDataView.cloneWithFields).toHaveBeenCalledTimes(2);
    });

    it('should invalidate cache when time field name changes', () => {
      const enricher = createEsqlDataViewEnricher();

      // First call with @timestamp
      const mockDataView1 = createMockDataView('test-id', '@timestamp');
      const columns1 = createColumns([
        { name: 'field1', type: 'string' },
        { name: '@timestamp', type: 'date', esType: 'date' },
      ]);
      const firstResult = enricher.enrich(mockDataView1, columns1);

      // Second call with different time field name (timestamp instead of @timestamp)
      const mockDataView2 = createMockDataView('test-id', 'timestamp');
      const columns2 = createColumns([
        { name: 'field1', type: 'string' },
        { name: 'timestamp', type: 'date', esType: 'date' },
      ]);
      const secondResult = enricher.enrich(mockDataView2, columns2);

      expect(firstResult?.timeFieldName).toBe('@timestamp');
      expect(secondResult?.timeFieldName).toBe('timestamp');
      expect(firstResult).not.toBe(secondResult);
      expect(mockDataView1.cloneWithFields).toHaveBeenCalledTimes(1);
      expect(mockDataView2.cloneWithFields).toHaveBeenCalledTimes(1);
    });
  });
});
