/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DatatableColumnType } from '@kbn/expressions-plugin/common';
import {
  deserializeHeaderRowHeight,
  getEuiGridColumns,
  getVisibleColumns,
  canPrependTimeFieldColumn,
} from './data_table_columns';
import { dataViewWithTimefieldMock } from '../../__mocks__/data_view_with_timefield';
import { dataViewWithoutTimefieldMock } from '../../__mocks__/data_view_without_timefield';
import { dataTableContextMock } from '../../__mocks__/table_context';
import { servicesMock } from '../../__mocks__/services';
import { ROWS_HEIGHT_OPTIONS } from '../constants';

const columns = ['extension', 'message'];
const columnsWithTimeCol = getVisibleColumns(
  ['extension', 'message'],
  dataViewWithTimefieldMock,
  true
) as string[];

describe('Data table columns', function () {
  describe('getEuiGridColumns', () => {
    it('returns eui grid columns showing default columns', async () => {
      const actual = getEuiGridColumns({
        columns,
        settings: {},
        dataView: dataViewWithTimefieldMock,
        defaultColumns: true,
        isSortEnabled: true,
        isPlainRecord: false,
        valueToStringConverter: dataTableContextMock.valueToStringConverter,
        rowsCount: 100,
        headerRowHeightLines: 5,
        services: {
          uiSettings: servicesMock.uiSettings,
          toastNotifications: servicesMock.toastNotifications,
        },
        hasEditDataViewPermission: () =>
          servicesMock.dataViewFieldEditor.userPermissions.editIndexPattern(),
        onFilter: () => {},
      });
      expect(actual).toMatchSnapshot();
    });

    it('returns eui grid columns with time column', async () => {
      const actual = getEuiGridColumns({
        columns: columnsWithTimeCol,
        settings: {},
        dataView: dataViewWithTimefieldMock,
        defaultColumns: false,
        isSortEnabled: true,
        isPlainRecord: false,
        valueToStringConverter: dataTableContextMock.valueToStringConverter,
        rowsCount: 100,
        headerRowHeightLines: 5,
        services: {
          uiSettings: servicesMock.uiSettings,
          toastNotifications: servicesMock.toastNotifications,
        },
        hasEditDataViewPermission: () =>
          servicesMock.dataViewFieldEditor.userPermissions.editIndexPattern(),
        onFilter: () => {},
      });
      expect(actual).toMatchSnapshot();
    });

    it('returns eui grid with in memory sorting', async () => {
      const actual = getEuiGridColumns({
        columns: columnsWithTimeCol,
        settings: {},
        dataView: dataViewWithTimefieldMock,
        defaultColumns: false,
        isSortEnabled: true,
        isPlainRecord: true,
        valueToStringConverter: dataTableContextMock.valueToStringConverter,
        rowsCount: 100,
        headerRowHeightLines: 5,
        services: {
          uiSettings: servicesMock.uiSettings,
          toastNotifications: servicesMock.toastNotifications,
        },
        hasEditDataViewPermission: () =>
          servicesMock.dataViewFieldEditor.userPermissions.editIndexPattern(),
        onFilter: () => {},
      });
      expect(actual).toMatchSnapshot();
    });
  });

  describe('getVisibleColumns', () => {
    it('returns grid columns without time column when data view has no timestamp field', () => {
      const actual = getVisibleColumns(['extension', 'message'], dataViewMock, true) as string[];
      expect(actual).toEqual(['extension', 'message']);
    });

    it('returns grid columns without time column when showTimeCol is falsy', () => {
      const actual = getVisibleColumns(
        ['extension', 'message'],
        dataViewWithTimefieldMock,
        false
      ) as string[];
      expect(actual).toEqual(['extension', 'message']);
    });

    it('returns grid columns with time column when data view has timestamp field', () => {
      const actual = getVisibleColumns(
        ['extension', 'message'],
        dataViewWithTimefieldMock,
        true
      ) as string[];
      expect(actual).toEqual(['timestamp', 'extension', 'message']);
    });
  });

  describe('canPrependTimeFieldColumn', () => {
    function buildColumnTypes(dataView: DataView) {
      const columnsMeta: Record<
        string,
        { type: DatatableColumnType; esType?: string | undefined }
      > = {};
      for (const field of dataView.fields) {
        columnsMeta[field.name] = { type: field.type as DatatableColumnType };
      }
      return columnsMeta;
    }

    describe('dataView with timeField', () => {
      it('should forward showTimeCol if no _source columns is passed', () => {
        for (const showTimeCol of [true, false]) {
          expect(
            canPrependTimeFieldColumn(
              ['extension', 'message'],
              dataViewWithTimefieldMock.timeFieldName,
              buildColumnTypes(dataViewWithTimefieldMock),
              showTimeCol,
              false
            )
          ).toBe(showTimeCol);
        }
      });

      it('should return false if no _source columns is passed, text-based datasource', () => {
        for (const showTimeCol of [true, false]) {
          expect(
            canPrependTimeFieldColumn(
              ['extension', 'message'],
              dataViewWithTimefieldMock.timeFieldName,
              buildColumnTypes(dataViewWithTimefieldMock),
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
              dataViewWithTimefieldMock.timeFieldName,
              buildColumnTypes(dataViewWithTimefieldMock),
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
              dataViewWithTimefieldMock.timeFieldName,
              buildColumnTypes(dataViewWithTimefieldMock),
              showTimeCol,
              true
            )
          ).toBe(showTimeCol);
        }
      });

      it('should return false if _source column is passed but time field is not returned, text-based datasource', () => {
        // ... | DROP @timestamp test case
        const columnsMeta = buildColumnTypes(dataViewWithTimefieldMock);
        if (dataViewWithTimefieldMock.timeFieldName) {
          delete columnsMeta[dataViewWithTimefieldMock.timeFieldName];
        }
        for (const showTimeCol of [true, false]) {
          expect(
            canPrependTimeFieldColumn(
              ['_source'],
              dataViewWithTimefieldMock.timeFieldName,
              columnsMeta,
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
              dataViewWithoutTimefieldMock.timeFieldName,
              buildColumnTypes(dataViewWithoutTimefieldMock),
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
              dataViewWithoutTimefieldMock.timeFieldName,
              buildColumnTypes(dataViewWithoutTimefieldMock),
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
              dataViewWithoutTimefieldMock.timeFieldName,
              buildColumnTypes(dataViewWithoutTimefieldMock),
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
              dataViewWithoutTimefieldMock.timeFieldName,
              buildColumnTypes(dataViewWithoutTimefieldMock),
              showTimeCol,
              true
            )
          ).toBe(false);
        }
      });
    });
  });

  describe('column tokens', () => {
    it('returns eui grid columns with tokens', async () => {
      const actual = getEuiGridColumns({
        showColumnTokens: true,
        columns: columnsWithTimeCol,
        settings: {},
        dataView: dataViewWithTimefieldMock,
        defaultColumns: false,
        isSortEnabled: true,
        isPlainRecord: false,
        valueToStringConverter: dataTableContextMock.valueToStringConverter,
        rowsCount: 100,
        headerRowHeightLines: 5,
        services: {
          uiSettings: servicesMock.uiSettings,
          toastNotifications: servicesMock.toastNotifications,
        },
        hasEditDataViewPermission: () =>
          servicesMock.dataViewFieldEditor.userPermissions.editIndexPattern(),
        onFilter: () => {},
      });
      expect(actual).toMatchSnapshot();
    });

    it('returns eui grid columns with tokens for custom column types', async () => {
      const actual = getEuiGridColumns({
        showColumnTokens: true,
        columnsMeta: {
          extension: { type: 'number' },
          message: { type: 'string', esType: 'keyword' },
        },
        columns,
        settings: {},
        dataView: dataViewWithTimefieldMock,
        defaultColumns: false,
        isSortEnabled: true,
        isPlainRecord: false,
        valueToStringConverter: dataTableContextMock.valueToStringConverter,
        rowsCount: 100,
        headerRowHeightLines: 5,
        services: {
          uiSettings: servicesMock.uiSettings,
          toastNotifications: servicesMock.toastNotifications,
        },
        hasEditDataViewPermission: () =>
          servicesMock.dataViewFieldEditor.userPermissions.editIndexPattern(),
        onFilter: () => {},
      });
      expect(actual).toMatchSnapshot();
    });
  });

  describe('Textbased languages grid columns', () => {
    it('returns eui grid with in memory sorting for text based languages and columns on the dataview', async () => {
      const columnsNotInDataview = getVisibleColumns(
        ['extension'],
        dataViewWithTimefieldMock,
        true
      ) as string[];
      const gridColumns = getEuiGridColumns({
        columns: columnsNotInDataview,
        settings: {},
        dataView: dataViewWithTimefieldMock,
        defaultColumns: false,
        isSortEnabled: true,
        isPlainRecord: true,
        valueToStringConverter: dataTableContextMock.valueToStringConverter,
        rowsCount: 100,
        headerRowHeightLines: 5,
        services: {
          uiSettings: servicesMock.uiSettings,
          toastNotifications: servicesMock.toastNotifications,
        },
        hasEditDataViewPermission: () =>
          servicesMock.dataViewFieldEditor.userPermissions.editIndexPattern(),
        onFilter: () => {},
        columnsMeta: {
          var_test: { type: 'number' },
        },
      });
      expect(gridColumns[1].schema).toBe('string');
    });

    it('returns eui grid with in memory sorting for text based languages and columns not on the columnsMeta', async () => {
      const columnsNotInDataview = getVisibleColumns(
        ['var_test'],
        dataViewWithTimefieldMock,
        true
      ) as string[];
      const gridColumns = getEuiGridColumns({
        columns: columnsNotInDataview,
        settings: {},
        dataView: dataViewWithTimefieldMock,
        defaultColumns: false,
        isSortEnabled: true,
        isPlainRecord: true,
        valueToStringConverter: dataTableContextMock.valueToStringConverter,
        rowsCount: 100,
        headerRowHeightLines: 5,
        services: {
          uiSettings: servicesMock.uiSettings,
          toastNotifications: servicesMock.toastNotifications,
        },
        hasEditDataViewPermission: () =>
          servicesMock.dataViewFieldEditor.userPermissions.editIndexPattern(),
        onFilter: () => {},
        columnsMeta: {
          var_test: { type: 'number' },
        },
      });
      expect(gridColumns[1].schema).toBe('numeric');
    });

    it('returns columns in correct format when column customisation is provided', async () => {
      const gridColumns = getEuiGridColumns({
        columns,
        settings: {},
        dataView: dataViewWithTimefieldMock,
        defaultColumns: false,
        isSortEnabled: true,
        isPlainRecord: true,
        valueToStringConverter: dataTableContextMock.valueToStringConverter,
        rowsCount: 100,
        headerRowHeightLines: 5,
        services: {
          uiSettings: servicesMock.uiSettings,
          toastNotifications: servicesMock.toastNotifications,
        },
        hasEditDataViewPermission: () =>
          servicesMock.dataViewFieldEditor.userPermissions.editIndexPattern(),
        onFilter: () => {},
      });

      const extensionGridColumn = gridColumns[0];
      extensionGridColumn.display = <span>test</span>;
      const customGridColumnsConfiguration = {
        extension: () => extensionGridColumn,
      };

      const customizedGridColumns = getEuiGridColumns({
        columns,
        settings: {},
        dataView: dataViewWithTimefieldMock,
        defaultColumns: false,
        isSortEnabled: true,
        isPlainRecord: true,
        valueToStringConverter: dataTableContextMock.valueToStringConverter,
        rowsCount: 100,
        headerRowHeightLines: 5,
        services: {
          uiSettings: servicesMock.uiSettings,
          toastNotifications: servicesMock.toastNotifications,
        },
        hasEditDataViewPermission: () =>
          servicesMock.dataViewFieldEditor.userPermissions.editIndexPattern(),
        onFilter: () => {},
        customGridColumnsConfiguration,
      });

      expect(customizedGridColumns).toMatchSnapshot();
    });
  });

  describe('deserializeHeaderRowHeight', () => {
    it('returns undefined for auto', () => {
      expect(deserializeHeaderRowHeight(ROWS_HEIGHT_OPTIONS.auto)).toBe(undefined);
    });

    it('returns 1 for single', () => {
      expect(deserializeHeaderRowHeight(ROWS_HEIGHT_OPTIONS.single)).toBe(1);
    });

    it('returns the value for other values', () => {
      expect(deserializeHeaderRowHeight(2)).toBe(2);
    });
  });
});
