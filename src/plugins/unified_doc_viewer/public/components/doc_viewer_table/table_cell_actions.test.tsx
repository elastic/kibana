/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { getFieldCellActions, getFieldValueCellActions, TableRow } from './table_cell_actions';
import { DataViewField } from '@kbn/data-views-plugin/common';

describe('TableActions', () => {
  const rows: TableRow[] = [
    {
      action: {
        onFilter: jest.fn(),
        flattenedField: 'flattenedField',
        onToggleColumn: jest.fn(),
      },
      field: {
        pinned: true,
        onTogglePinned: jest.fn(),
        field: 'message',
        fieldMapping: new DataViewField({
          type: 'keyword',
          name: 'message',
          searchable: true,
          aggregatable: true,
        }),
        fieldType: 'keyword',
        displayName: 'message',
        scripted: false,
      },
      value: {
        ignored: undefined,
        formattedValue: 'test',
      },
    },
  ];

  const Component = () => <div>Component</div>;
  const EuiCellParams = {
    Component,
    rowIndex: 0,
    colIndex: 0,
    columnId: 'test',
    isExpanded: false,
  };

  describe('getFieldCellActions', () => {
    it('should render correctly for undefined functions', () => {
      expect(
        getFieldCellActions({ rows, filter: undefined, onToggleColumn: jest.fn() }).map((item) =>
          item(EuiCellParams)
        )
      ).toMatchSnapshot();

      expect(
        getFieldCellActions({ rows, filter: undefined, onToggleColumn: undefined }).map((item) =>
          item(EuiCellParams)
        )
      ).toMatchSnapshot();
    });

    it('should render the panels correctly for defined onFilter function', () => {
      expect(
        getFieldCellActions({ rows, filter: jest.fn(), onToggleColumn: jest.fn() }).map((item) =>
          item(EuiCellParams)
        )
      ).toMatchSnapshot();
    });
  });

  describe('getFieldValueCellActions', () => {
    it('should render correctly for undefined functions', () => {
      expect(
        getFieldValueCellActions({ rows, filter: undefined }).map((item) => item(EuiCellParams))
      ).toMatchSnapshot();
    });

    it('should render the panels correctly for defined onFilter function', () => {
      expect(
        getFieldValueCellActions({ rows, filter: jest.fn() }).map((item) => item(EuiCellParams))
      ).toMatchSnapshot();
    });
  });
});
