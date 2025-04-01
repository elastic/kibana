/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataTableRecord } from '../types';
import { getFieldValue } from './get_field_value';

const dataTableRecord: DataTableRecord = {
  id: '1',
  raw: {},
  flattened: {
    'field1.value': 'value1',
    'field2.value': ['value2'],
  },
};

describe('getFieldValue', () => {
  it('should return the value of field correctly', () => {
    expect(getFieldValue(dataTableRecord, 'field1.value')).toBe('value1');
  });

  it('should return the first value of field correctly if field has a value of Array type', () => {
    expect(getFieldValue(dataTableRecord, 'field2.value')).toBe('value2');
  });

  it('should return undefined when field is not available', () => {
    expect(getFieldValue(dataTableRecord, 'field3.value')).toBeUndefined();
  });
});
