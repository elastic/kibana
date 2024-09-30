/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { getFieldCellActions, getFieldValueCellActions } from './table_cell_actions';
import { FieldRow } from './field_row';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { stubLogstashDataView as dataView } from '@kbn/data-views-plugin/common/data_view.stub';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';

describe('TableActions', () => {
  const rows: FieldRow[] = [
    new FieldRow({
      name: 'message',
      flattenedValue: 'flattenedField',
      hit: buildDataTableRecord(
        {
          _ignored: [],
          _index: 'test',
          _id: '1',
          _source: {
            message: 'test',
          },
        },
        dataView
      ),
      dataView,
      fieldFormats: {} as FieldFormatsStart,
      isPinned: false,
      columnsMeta: undefined,
    }),
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
        getFieldCellActions({ rows, onFilter: undefined, onToggleColumn: jest.fn() }).map((item) =>
          item(EuiCellParams)
        )
      ).toMatchSnapshot();

      expect(
        getFieldCellActions({ rows, onFilter: undefined, onToggleColumn: undefined }).map((item) =>
          item(EuiCellParams)
        )
      ).toMatchSnapshot();
    });

    it('should render the panels correctly for defined onFilter function', () => {
      expect(
        getFieldCellActions({ rows, onFilter: jest.fn(), onToggleColumn: jest.fn() }).map((item) =>
          item(EuiCellParams)
        )
      ).toMatchSnapshot();
    });
  });

  describe('getFieldValueCellActions', () => {
    it('should render correctly for undefined functions', () => {
      expect(
        getFieldValueCellActions({ rows, onFilter: undefined }).map((item) => item(EuiCellParams))
      ).toMatchSnapshot();
    });

    it('should render the panels correctly for defined onFilter function', () => {
      expect(
        getFieldValueCellActions({ rows, onFilter: jest.fn() }).map((item) => item(EuiCellParams))
      ).toMatchSnapshot();
    });
  });
});
