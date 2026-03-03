/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TextBasedLayer } from '@kbn/lens-common';
import { getValueColumn, getValueApiColumn } from './esql_column';

describe('getValueColumn', () => {
  it('should set correct columnId and fieldName', () => {
    const result = getValueColumn('col1', { column: 'my_field' });
    expect(result.columnId).toBe('col1');
    expect(result.fieldName).toBe('my_field');
  });

  it('should use id as fieldName when column is empty', () => {
    const result = getValueColumn('col1', { column: '' });
    expect(result.fieldName).toBe('col1');
  });

  it('should set meta.type from fieldType parameter', () => {
    const result = getValueColumn('col1', { column: 'my_field' }, 'number');
    expect(result.meta).toEqual({ type: 'number' });
  });

  it('should default meta.type to string', () => {
    const result = getValueColumn('col1', { column: 'my_field' });
    expect(result.meta).toEqual({ type: 'string' });
  });

  it('should set label and customLabel when label is provided', () => {
    const result = getValueColumn('col1', { column: 'my_field', label: 'My Label' });
    expect(result.label).toBe('My Label');
    expect(result.customLabel).toBe(true);
  });

  it('should not set label or customLabel when label is not provided', () => {
    const result = getValueColumn('col1', { column: 'my_field' });
    expect(result).not.toHaveProperty('label');
    expect(result).not.toHaveProperty('customLabel');
  });

  it('should set inMetricDimension when provided', () => {
    const result = getValueColumn('col1', { column: 'my_field' }, 'number', true);
    expect(result.inMetricDimension).toBe(true);
  });

  it('should not set inMetricDimension when not provided', () => {
    const result = getValueColumn('col1', { column: 'my_field' });
    expect(result).not.toHaveProperty('inMetricDimension');
  });
});

describe('getValueApiColumn', () => {
  const makeLayer = (columns: TextBasedLayer['columns']): TextBasedLayer =>
    ({ columns } as TextBasedLayer);

  it('should return basic API column shape', () => {
    const layer = makeLayer([{ columnId: 'col1', fieldName: 'my_field' }]);
    const result = getValueApiColumn('col1', layer);
    expect(result).toEqual({ operation: 'value', column: 'my_field' });
  });

  it('should include label when customLabel is true and label is set', () => {
    const layer = makeLayer([
      { columnId: 'col1', fieldName: 'my_field', label: 'My Label', customLabel: true },
    ]);
    const result = getValueApiColumn('col1', layer);
    expect(result).toEqual({ operation: 'value', column: 'my_field', label: 'My Label' });
  });

  it('should not include label when customLabel is false', () => {
    const layer = makeLayer([
      { columnId: 'col1', fieldName: 'my_field', label: 'My Label', customLabel: false },
    ]);
    const result = getValueApiColumn('col1', layer);
    expect(result).not.toHaveProperty('label');
  });

  it('should not include label when customLabel is absent', () => {
    const layer = makeLayer([{ columnId: 'col1', fieldName: 'my_field', label: 'My Label' }]);
    const result = getValueApiColumn('col1', layer);
    expect(result).not.toHaveProperty('label');
  });

  it('should round-trip label correctly', () => {
    const col = getValueColumn('col1', { column: 'my_field', label: 'Custom' });
    const layer = makeLayer([col]);
    const apiCol = getValueApiColumn('col1', layer);
    expect(apiCol.label).toBe('Custom');
  });
});
