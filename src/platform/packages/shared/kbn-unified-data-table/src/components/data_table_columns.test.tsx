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
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DatatableColumn, DatatableColumnType } from '@kbn/expressions-plugin/common';
import { EsqlSource, IndexPatternSource } from '@kbn/data-source';
import { deserializeHeaderRowHeight, getEuiGridColumns } from './data_table_columns';
import { dataViewWithTimefieldMock } from '../../__mocks__/data_view_with_timefield';
import { dataTableContextMock } from '../../__mocks__/table_context';
import { servicesMock } from '../../__mocks__/services';
import { ROWS_HEIGHT_OPTIONS, kibanaJSON } from '../constants';
import type { UnifiedDataTableSettingsColumn } from '../types';

const columns = ['extension', 'message'];
const columnsWithTimeCol = getVisibleColumns(
  ['extension', 'message'],
  dataViewWithTimefieldMock.timeFieldName,
  true
) as string[];

const makeResultColumn = (
  name: string,
  type: DatatableColumnType,
  esType?: string
): DatatableColumn => ({
  id: name,
  name,
  meta: { type, esType },
});

/**
 * Builds an `EsqlSource` for a text-based (ES|QL) columns scenario. Columns present in
 * `columnsMeta` use the provided type/esType (mirroring the removed `columnsMeta` override
 * behavior); any other column falls back to its type in `dataView`, matching the previous
 * fallback-to-data-view behavior.
 */
const createTextBasedDataSource = ({
  columns: resultColumnNames,
  dataView,
  columnsMeta = {},
}: {
  columns: string[];
  dataView: DataView;
  columnsMeta?: Record<string, { type: DatatableColumnType; esType?: string }>;
}) => {
  const resultColumns = resultColumnNames.map((name) => {
    const meta = columnsMeta[name];
    if (meta) {
      return makeResultColumn(name, meta.type, meta.esType);
    }
    const field = dataView.fields.getByName(name);
    return makeResultColumn(
      name,
      (field?.type as DatatableColumnType) ?? 'string',
      field?.esTypes?.[0]
    );
  });
  return EsqlSource.create({
    query: `FROM ${dataView.name}`,
    resultColumns,
    timeFieldName: dataView.timeFieldName,
  });
};

describe('Data table columns', function () {
  describe('getEuiGridColumns', () => {
    it('returns eui grid columns showing default columns', async () => {
      const actual = getEuiGridColumns({
        sourceDisplayMode: 'summary',
        columns,
        settings: {},
        dataSource: new IndexPatternSource(dataViewWithTimefieldMock),
        isSummaryOnlyColumn: true,
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
        sourceDisplayMode: 'summary',
        columns: columnsWithTimeCol,
        settings: {},
        dataSource: new IndexPatternSource(dataViewWithTimefieldMock),
        isSummaryOnlyColumn: false,
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
      const dataSource = await createTextBasedDataSource({
        columns: columnsWithTimeCol,
        dataView: dataViewWithTimefieldMock,
        columnsMeta: {
          extension: { type: 'string' },
          message: { type: 'string', esType: 'keyword' },
          timestamp: { type: 'date', esType: 'dateTime' },
        },
      });
      const actual = getEuiGridColumns({
        sourceDisplayMode: 'summary',
        columns: columnsWithTimeCol,
        settings: {},
        dataSource,
        isSummaryOnlyColumn: false,
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
        onResize: () => {},
        cellActionsHandling: 'replace',
      });
      expect(actual).toMatchSnapshot();
    });

    describe('cell actions', () => {
      it('should replace cell actions', async () => {
        const cellAction = jest.fn();
        const dataSource = await createTextBasedDataSource({
          columns: columnsWithTimeCol,
          dataView: dataViewWithTimefieldMock,
          columnsMeta: {
            extension: { type: 'string' },
            message: { type: 'string', esType: 'keyword' },
            timestamp: { type: 'date', esType: 'dateTime' },
          },
        });
        const actual = getEuiGridColumns({
          sourceDisplayMode: 'summary',
          columns: columnsWithTimeCol,
          settings: {},
          dataSource,
          isSummaryOnlyColumn: false,
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
          onResize: () => {},
          columnsCellActions: [[cellAction]],
          cellActionsHandling: 'replace',
        });
        expect(actual[0].cellActions).toEqual([cellAction]);
      });

      it('should append cell actions', async () => {
        const cellAction = jest.fn();
        const dataSource = await createTextBasedDataSource({
          columns: columnsWithTimeCol,
          dataView: dataViewWithTimefieldMock,
          columnsMeta: {
            extension: { type: 'string' },
            message: { type: 'string', esType: 'keyword' },
            timestamp: { type: 'date', esType: 'dateTime' },
          },
        });
        const actual = getEuiGridColumns({
          sourceDisplayMode: 'summary',
          columns: columnsWithTimeCol,
          settings: {},
          dataSource,
          isSummaryOnlyColumn: false,
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
          onResize: () => {},
          columnsCellActions: [[cellAction]],
          cellActionsHandling: 'append',
          hideFilteringOnComputedColumns: false,
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
        sourceDisplayMode: 'summary',
        showColumnTokens: true,
        columns: columnsWithTimeCol,
        settings: {},
        dataSource: new IndexPatternSource(dataViewWithTimefieldMock),
        isSummaryOnlyColumn: false,
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
      const dataSource = await createTextBasedDataSource({
        columns,
        dataView: dataViewWithTimefieldMock,
        columnsMeta: {
          extension: { type: 'string' },
          message: { type: 'string', esType: 'keyword' },
        },
      });
      const actual = getEuiGridColumns({
        sourceDisplayMode: 'summary',
        showColumnTokens: true,
        columns,
        settings: {},
        dataSource,
        isSummaryOnlyColumn: false,
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
        dataViewWithTimefieldMock.timeFieldName,
        true
      ) as string[];
      const dataSource = await createTextBasedDataSource({
        columns: columnsNotInDataview,
        dataView: dataViewWithTimefieldMock,
        columnsMeta: {
          extension: { type: 'string' },
        },
      });
      const gridColumns = getEuiGridColumns({
        sourceDisplayMode: 'summary',
        columns: columnsNotInDataview,
        settings: {},
        dataSource,
        isSummaryOnlyColumn: false,
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
        onResize: () => {},
        cellActionsHandling: 'replace',
      });
      expect(gridColumns[1].schema).toBe('string');
      expect(gridColumns[1].isSortable).toBe(true);
    });

    it('should not allow sorting on json columns', async () => {
      const dataSource = await createTextBasedDataSource({
        columns: ['geo.coordinates'],
        dataView: dataViewWithTimefieldMock,
        columnsMeta: {
          'geo.coordinates': { type: 'geo_point' },
        },
      });
      const gridColumns = getEuiGridColumns({
        sourceDisplayMode: 'summary',
        columns: ['geo.coordinates'],
        settings: {},
        dataSource,
        isSummaryOnlyColumn: false,
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
        onResize: () => {},
        cellActionsHandling: 'replace',
      });
      expect(gridColumns[0].schema).toBe(kibanaJSON);
      expect(gridColumns[0].isSortable).toBe(false);
    });

    it('should allow sorting on version columns', async () => {
      const dataSource = await createTextBasedDataSource({
        columns: ['stack_version'],
        dataView: dataViewWithTimefieldMock,
        columnsMeta: {
          stack_version: { type: 'version' as DatatableColumnType },
        },
      });
      const gridColumns = getEuiGridColumns({
        sourceDisplayMode: 'summary',
        columns: ['stack_version'],
        settings: {},
        dataSource,
        isSummaryOnlyColumn: false,
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
        onResize: () => {},
        cellActionsHandling: 'replace',
      });
      expect(gridColumns[0].schema).toBe(kibanaJSON);
      expect(gridColumns[0].isSortable).toBe(true);
    });

    it('should allow sorting on ip columns', async () => {
      const dataSource = await createTextBasedDataSource({
        columns: ['ip_address'],
        dataView: dataViewWithTimefieldMock,
        columnsMeta: {
          ip_address: { type: 'ip' },
        },
      });
      const gridColumns = getEuiGridColumns({
        sourceDisplayMode: 'summary',
        columns: ['ip_address'],
        settings: {},
        dataSource,
        isSummaryOnlyColumn: false,
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
        onResize: () => {},
        cellActionsHandling: 'replace',
      });
      expect(gridColumns[0].schema).toBe('numeric');
      expect(gridColumns[0].isSortable).toBe(true);
    });

    it('returns eui grid with in memory sorting for text based languages and columns not on the columnsMeta', async () => {
      const columnsNotInDataview = getVisibleColumns(
        ['var_test'],
        dataViewWithTimefieldMock.timeFieldName,
        true
      ) as string[];
      const dataSource = await createTextBasedDataSource({
        columns: columnsNotInDataview,
        dataView: dataViewWithTimefieldMock,
        columnsMeta: {
          var_test: { type: 'number' },
        },
      });
      const gridColumns = getEuiGridColumns({
        sourceDisplayMode: 'summary',
        columns: columnsNotInDataview,
        settings: {},
        dataSource,
        isSummaryOnlyColumn: false,
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
        onResize: () => {},
        cellActionsHandling: 'replace',
      });
      expect(gridColumns[1].schema).toBe('numeric');
      expect(gridColumns[1].isSortable).toBe(true);
    });

    it('returns columns in correct format when column customisation is provided', async () => {
      const dataSource = await createTextBasedDataSource({
        columns,
        dataView: dataViewWithTimefieldMock,
        columnsMeta: {
          extension: { type: 'string' },
          message: { type: 'string', esType: 'keyword' },
        },
      });
      const gridColumns = getEuiGridColumns({
        sourceDisplayMode: 'summary',
        columns,
        settings: {},
        dataSource,
        isSummaryOnlyColumn: false,
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
        onResize: () => {},
        cellActionsHandling: 'replace',
      });

      const extensionGridColumn = gridColumns[0];
      extensionGridColumn.display = <span>test</span>;
      const customGridColumnsConfiguration = {
        extension: () => extensionGridColumn,
      };

      const customizedGridColumns = getEuiGridColumns({
        sourceDisplayMode: 'summary',
        columns,
        settings: {},
        dataSource,
        isSummaryOnlyColumn: false,
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
        onResize: () => {},
        cellActionsHandling: 'replace',
      });

      expect(customizedGridColumns).toMatchSnapshot();
    });
  });

  describe('Summary column', () => {
    it('returns eui grid columns with summary column', async () => {
      const actual = getEuiGridColumns({
        sourceDisplayMode: 'summary',
        columns: ['_source'],
        settings: {},
        dataSource: new IndexPatternSource(dataViewWithTimefieldMock),
        isSummaryOnlyColumn: false,
        isSortEnabled: false,
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
      expect(actual.find((column) => column.id === '_source')?.initialWidth).toBeUndefined();
    });
  });

  describe('JSON column', () => {
    it('does not apply custom grid column configuration to the _source column in JSON mode', () => {
      const customizeSourceColumn = jest.fn(({ column }) => ({
        ...column,
        displayAsText: 'Custom Summary',
        isExpandable: true,
      }));

      const actual = getEuiGridColumns({
        sourceDisplayMode: 'json',
        columns: ['_source'],
        settings: {},
        dataSource: new IndexPatternSource(dataViewWithTimefieldMock),
        isSummaryOnlyColumn: false,
        isSortEnabled: false,
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
        customGridColumnsConfiguration: {
          _source: customizeSourceColumn,
        },
      });

      expect(customizeSourceColumn).not.toHaveBeenCalled();
      expect(actual[0].id).toBe('_source');
      expect(actual[0].displayAsText).toBe('JSON');
      expect(actual[0].isExpandable).toBe(false);
      expect(actual[0].cellActions).toEqual([]);
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
        sourceDisplayMode: 'summary',
        columns: ['test_column_1', 'test_column_2', 'test_column_4'],
        settings: { columns: mockColumnHeaders },
        dataSource: new IndexPatternSource(dataViewWithTimefieldMock),
        isSummaryOnlyColumn: false,
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
