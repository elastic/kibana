/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { getEuiGridColumns, getVisibleColumns } from './data_table_columns';
import { dataViewWithTimefieldMock } from '../../__mocks__/data_view_with_timefield';
import { dataTableContextMock } from '../../__mocks__/table_context';
import { servicesMock } from '../../__mocks__/services';

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
        columnTypes: {
          extension: 'number',
          message: 'keyword',
        },
        columns,
        settings: {},
        dataView: dataViewWithTimefieldMock,
        defaultColumns: false,
        isSortEnabled: true,
        isPlainRecord: false,
        valueToStringConverter: dataTableContextMock.valueToStringConverter,
        rowsCount: 100,
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
});
