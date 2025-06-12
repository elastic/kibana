/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { getVisibleColumns } from '@kbn/discover-utils';
import { deserializeHeaderRowHeight, getEuiGridColumns } from './data_table_columns';
import { dataViewWithTimefieldMock } from '../../__mocks__/data_view_with_timefield';
import { dataTableContextMock } from '../../__mocks__/table_context';
import { servicesMock } from '../../__mocks__/services';
import { ROWS_HEIGHT_OPTIONS } from '../constants';
import { UnifiedDataTableSettingsColumn } from '../types';

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
        onResize: () => {},
        cellActionsHandling: 'replace',
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
        onResize: () => {},
        cellActionsHandling: 'replace',
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
        columnsMeta: {
          extension: { type: 'string' },
          message: { type: 'string', esType: 'keyword' },
          timestamp: { type: 'date', esType: 'dateTime' },
        },
        onResize: () => {},
        cellActionsHandling: 'replace',
      });
      expect(actual).toMatchSnapshot();
    });

    describe('cell actions', () => {
      it('should replace cell actions', async () => {
        const cellAction = jest.fn();
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
          columnsMeta: {
            extension: { type: 'string' },
            message: { type: 'string', esType: 'keyword' },
            timestamp: { type: 'date', esType: 'dateTime' },
          },
          onResize: () => {},
          columnsCellActions: [[cellAction]],
          cellActionsHandling: 'replace',
        });
        expect(actual[0].cellActions).toEqual([cellAction]);
      });

      it('should append cell actions', async () => {
        const cellAction = jest.fn();
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
          columnsMeta: {
            extension: { type: 'string' },
            message: { type: 'string', esType: 'keyword' },
            timestamp: { type: 'date', esType: 'dateTime' },
          },
          onResize: () => {},
          columnsCellActions: [[cellAction]],
          cellActionsHandling: 'append',
        });
        expect(actual[0].cellActions).toEqual([
          expect.any(Function),
          expect.any(Function),
          expect.any(Function),
          cellAction,
        ]);
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
        onResize: () => {},
        cellActionsHandling: 'replace',
      });
      expect(actual).toMatchSnapshot();
    });

    it('returns eui grid columns with tokens for custom column types', async () => {
      const actual = getEuiGridColumns({
        showColumnTokens: true,
        columnsMeta: {
          extension: { type: 'string' },
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
        onResize: () => {},
        cellActionsHandling: 'replace',
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
          extension: { type: 'string' },
        },
        onResize: () => {},
        cellActionsHandling: 'replace',
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
        onResize: () => {},
        cellActionsHandling: 'replace',
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
        columnsMeta: {
          extension: { type: 'string' },
          message: { type: 'string', esType: 'keyword' },
        },
        onResize: () => {},
        cellActionsHandling: 'replace',
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
        columnsMeta: {
          extension: { type: 'string' },
          message: { type: 'string', esType: 'keyword' },
        },
        onResize: () => {},
        cellActionsHandling: 'replace',
      });

      expect(customizedGridColumns).toMatchSnapshot();
    });
  });

  describe('deserializeHeaderRowHeight', () => {
    it('returns undefined for auto', () => {
      expect(deserializeHeaderRowHeight(ROWS_HEIGHT_OPTIONS.auto)).toBe(undefined);
    });

    it('returns the value for other values', () => {
      expect(deserializeHeaderRowHeight(2)).toBe(2);
    });
  });

  describe('Column label display', () => {
    it('Column Name should display provided label from display otherwise it defaults to columns name', () => {
      const mockColumnHeaders: Record<string, UnifiedDataTableSettingsColumn> = {
        test_column_1: { display: 'test_column_one' },
        test_column_2: { display: 'test_column_two' },
        test_column_3: { display: 'test_column_three' },
      } as const;
      const customizedGridColumns = getEuiGridColumns({
        columns: ['test_column_1', 'test_column_2', 'test_column_4'],
        settings: { columns: mockColumnHeaders },
        dataView: dataViewWithTimefieldMock,
        defaultColumns: false,
        isSortEnabled: true,
        valueToStringConverter: dataTableContextMock.valueToStringConverter,
        rowsCount: 100,
        headerRowHeightLines: 5,
        services: {
          uiSettings: servicesMock.uiSettings,
          toastNotifications: servicesMock.toastNotifications,
        },
        hasEditDataViewPermission: () =>
          servicesMock.dataViewFieldEditor.userPermissions.editIndexPattern(),
        onResize: () => {},
        cellActionsHandling: 'replace',
      });
      const columnDisplayNames = customizedGridColumns.map((column) => column.displayAsText);
      expect(columnDisplayNames.includes('test_column_one')).toBeTruthy();
      expect(columnDisplayNames.includes('test_column_two')).toBeTruthy();
      expect(columnDisplayNames.includes('test_column_three')).toBeFalsy();
      expect(columnDisplayNames.includes('test_column_4')).toBeTruthy();
    });
  });
});
