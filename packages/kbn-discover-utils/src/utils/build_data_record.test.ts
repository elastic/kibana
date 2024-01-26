/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildDataTableRecord, buildDataTableRecordList } from './build_data_record';
import { dataViewMock, esHitsMock } from '../__mocks__';

describe('Data table record utils', () => {
  describe('buildDataTableRecord', () => {
    test('should return a DataTableRecord', () => {
      const result = buildDataTableRecord(esHitsMock[0], dataViewMock, false);
      expect(result).toHaveProperty('id', 'i::1::');
      expect(result).toHaveProperty('raw', esHitsMock[0]);
      expect(result).toHaveProperty('flattened');
      expect(result).toHaveProperty('isAnchor', false);
    });
  });

  describe('buildDataTableRecordList', () => {
    test('should return a list of DataTableRecord', () => {
      const result = buildDataTableRecordList(esHitsMock, dataViewMock);
      result.forEach((doc) => {
        expect(doc).toHaveProperty('id');
        expect(doc).toHaveProperty('raw');
        expect(doc).toHaveProperty('flattened');
        expect(doc).toHaveProperty('isAnchor');
      });
    });
  });
});
