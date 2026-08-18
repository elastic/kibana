/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  dataViewMock as dataViewMockWithoutTimeField,
  dataViewMockWithTimeField,
} from '../__mocks__';
import { getVisibleColumns, canPrependTimeFieldColumn } from './get_visible_columns';

describe('getVisibleColumns utils', function () {
  describe('getVisibleColumns', () => {
    it('returns grid columns without time column when data view has no timestamp field', () => {
      const actual = getVisibleColumns(
        ['extension', 'message'],
        dataViewMockWithoutTimeField,
        true
      ) as string[];
      expect(actual).toEqual(['extension', 'message']);
    });

    it('returns grid columns without time column when showTimeCol is falsy', () => {
      const actual = getVisibleColumns(
        ['extension', 'message'],
        dataViewMockWithTimeField,
        false
      ) as string[];
      expect(actual).toEqual(['extension', 'message']);
    });

    it('returns grid columns with time column when data view has timestamp field', () => {
      const actual = getVisibleColumns(
        ['extension', 'message'],
        dataViewMockWithTimeField,
        true
      ) as string[];
      expect(actual).toEqual(['@timestamp', 'extension', 'message']);
    });
  });

  describe('canPrependTimeFieldColumn', () => {
    describe('dataView with timeField', () => {
      it('should forward showTimeCol if no _source columns is passed', () => {
        for (const showTimeCol of [true, false]) {
          expect(
            canPrependTimeFieldColumn(
              ['extension', 'message'],
              dataViewMockWithTimeField.timeFieldName,
              true,
              showTimeCol,
              false
            )
          ).toBe(showTimeCol);
        }
      });

      it('should return false for a text-based datasource when no _source column is passed, even if the time field is in the result', () => {
        // Without a `_source` column present, ES|QL mode never prepends the time
        // field: the time field would already be its own explicit column.
        for (const showTimeCol of [true, false]) {
          expect(
            canPrependTimeFieldColumn(
              ['extension', 'message'],
              dataViewMockWithTimeField.timeFieldName,
              true,
              showTimeCol,
              true
            )
          ).toBe(false);
        }
      });

      it('should forward showTimeCol if _source column is passed', () => {
        for (const showTimeCol of [true, false]) {
          expect(
            canPrependTimeFieldColumn(
              ['_source'],
              dataViewMockWithTimeField.timeFieldName,
              true,
              showTimeCol,
              false
            )
          ).toBe(showTimeCol);
        }
      });

      it('should forward showTimeCol if _source column is passed, text-based datasource', () => {
        for (const showTimeCol of [true, false]) {
          expect(
            canPrependTimeFieldColumn(
              ['_source'],
              dataViewMockWithTimeField.timeFieldName,
              true,
              showTimeCol,
              true
            )
          ).toBe(showTimeCol);
        }
      });

      it('should return false if _source column is passed but time field is not returned, text-based datasource', () => {
        // ... | DROP @timestamp test case
        for (const showTimeCol of [true, false]) {
          expect(
            canPrependTimeFieldColumn(
              ['_source'],
              dataViewMockWithTimeField.timeFieldName,
              false,
              showTimeCol,
              true
            )
          ).toBe(false);
        }
      });
    });

    describe('dataView without timeField', () => {
      it('should return false if no _source columns is passed', () => {
        for (const showTimeCol of [true, false]) {
          expect(
            canPrependTimeFieldColumn(
              ['extension', 'message'],
              dataViewMockWithoutTimeField.timeFieldName,
              false,
              showTimeCol,
              false
            )
          ).toBe(false);
        }
      });

      it('should return false if no _source columns is passed, text-based datasource', () => {
        for (const showTimeCol of [true, false]) {
          expect(
            canPrependTimeFieldColumn(
              ['extension', 'message'],
              dataViewMockWithoutTimeField.timeFieldName,
              false,
              showTimeCol,
              true
            )
          ).toBe(false);
        }
      });

      it('should return false if _source column is passed', () => {
        for (const showTimeCol of [true, false]) {
          expect(
            canPrependTimeFieldColumn(
              ['_source'],
              dataViewMockWithoutTimeField.timeFieldName,
              false,
              showTimeCol,
              false
            )
          ).toBe(false);
        }
      });

      it('should return false if _source column is passed, text-based datasource', () => {
        for (const showTimeCol of [true, false]) {
          expect(
            canPrependTimeFieldColumn(
              ['_source'],
              dataViewMockWithoutTimeField.timeFieldName,
              false,
              showTimeCol,
              true
            )
          ).toBe(false);
        }
      });
    });
  });
});
