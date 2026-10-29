/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import { createMockEsqlSource } from '@kbn/data-source/src/__mocks__/esql_source.mock';
import {
  buildDataViewMock,
  dataViewMock as dataViewMockWithoutTimeField,
  dataViewMockWithTimeField,
  deepMockedFields,
} from '../__mocks__';
import { getVisibleColumns, canPrependTimeFieldColumn } from './get_visible_columns';

const dataViewMockWithMissingTimeField = buildDataViewMock({
  name: 'the-data-view-with-missing-time-field',
  fields: deepMockedFields,
  timeFieldName: 'missing_time_field',
});

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
    function buildEsqlSource(dataView: DataView, { except }: { except?: string } = {}) {
      return createMockEsqlSource(
        dataView.fields
          .filter(({ name }) => name !== except)
          .map(({ name, type }) => ({ name, type, source: 'index' as const }))
      );
    }

    describe('dataView with timeField', () => {
      it('should forward showTimeCol if no _source columns is passed', () => {
        for (const showTimeCol of [true, false]) {
          expect(
            canPrependTimeFieldColumn(
              ['extension', 'message'],
              dataViewMockWithTimeField,
              undefined,
              showTimeCol
            )
          ).toBe(showTimeCol);
        }
      });

      it('should forward showTimeCol if no _source columns is passed, text-based datasource', () => {
        for (const showTimeCol of [true, false]) {
          expect(
            canPrependTimeFieldColumn(
              ['extension', 'message'],
              dataViewMockWithTimeField,
              buildEsqlSource(dataViewMockWithTimeField),
              showTimeCol
            )
          ).toBe(showTimeCol);
        }
      });

      it('should forward showTimeCol if _source column is passed', () => {
        for (const showTimeCol of [true, false]) {
          expect(
            canPrependTimeFieldColumn(
              ['_source'],
              dataViewMockWithTimeField,
              undefined,
              showTimeCol
            )
          ).toBe(showTimeCol);
        }
      });

      it('should forward showTimeCol if _source column is passed, text-based datasource', () => {
        for (const showTimeCol of [true, false]) {
          expect(
            canPrependTimeFieldColumn(
              ['_source'],
              dataViewMockWithTimeField,
              buildEsqlSource(dataViewMockWithTimeField),
              showTimeCol
            )
          ).toBe(showTimeCol);
        }
      });

      it('should return false if _source column is passed but time field is not returned, text-based datasource', () => {
        // ... | DROP @timestamp test case
        const dataSource = buildEsqlSource(dataViewMockWithTimeField, {
          except: dataViewMockWithTimeField.timeFieldName,
        });
        for (const showTimeCol of [true, false]) {
          expect(
            canPrependTimeFieldColumn(
              ['_source'],
              dataViewMockWithTimeField,
              dataSource,
              showTimeCol
            )
          ).toBe(false);
        }
      });
    });

    describe('dataView with a timeField which is missing in the field list', () => {
      it('should return false if no _source columns is passed', () => {
        for (const showTimeCol of [true, false]) {
          expect(
            canPrependTimeFieldColumn(
              ['extension', 'message'],
              dataViewMockWithMissingTimeField,
              undefined,
              showTimeCol
            )
          ).toBe(false);
        }
      });

      it('should forward showTimeCol if the field list is not loaded yet', () => {
        const dataViewWithoutLoadedFields = {
          ...dataViewMockWithMissingTimeField,
          fields: undefined,
          getFieldByName: () => undefined,
        } as unknown as DataView;
        for (const showTimeCol of [true, false]) {
          expect(
            canPrependTimeFieldColumn(
              ['_source'],
              dataViewWithoutLoadedFields,
              undefined,
              showTimeCol
            )
          ).toBe(showTimeCol);
        }
      });

      it('should rely on the returned columns instead, text-based datasource', () => {
        const dataSource = createMockEsqlSource([
          { name: 'missing_time_field', type: 'date', source: 'index' },
          { name: 'extension', type: 'string', source: 'index' },
        ]);
        for (const showTimeCol of [true, false]) {
          expect(
            canPrependTimeFieldColumn(
              ['_source'],
              dataViewMockWithMissingTimeField,
              dataSource,
              showTimeCol
            )
          ).toBe(showTimeCol);
        }
      });
    });

    describe('dataView without timeField', () => {
      it('should return false if no _source columns is passed', () => {
        for (const showTimeCol of [true, false]) {
          expect(
            canPrependTimeFieldColumn(
              ['extension', 'message'],
              dataViewMockWithoutTimeField,
              undefined,
              showTimeCol
            )
          ).toBe(false);
        }
      });

      it('should return false if no _source columns is passed, text-based datasource', () => {
        for (const showTimeCol of [true, false]) {
          expect(
            canPrependTimeFieldColumn(
              ['extension', 'message'],
              dataViewMockWithoutTimeField,
              buildEsqlSource(dataViewMockWithoutTimeField),
              showTimeCol
            )
          ).toBe(false);
        }
      });

      it('should return false if _source column is passed', () => {
        for (const showTimeCol of [true, false]) {
          expect(
            canPrependTimeFieldColumn(
              ['_source'],
              dataViewMockWithoutTimeField,
              undefined,
              showTimeCol
            )
          ).toBe(false);
        }
      });

      it('should return false if _source column is passed, text-based datasource', () => {
        for (const showTimeCol of [true, false]) {
          expect(
            canPrependTimeFieldColumn(
              ['_source'],
              dataViewMockWithoutTimeField,
              buildEsqlSource(dataViewMockWithoutTimeField),
              showTimeCol
            )
          ).toBe(false);
        }
      });
    });
  });
});
