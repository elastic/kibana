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
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { render, screen } from '@testing-library/react';
import { dataViewMockWithTimeField } from '@kbn/discover-utils/src/__mocks__';

describe('TableActions', () => {
  const getRows = (fieldName = 'message', fieldValue: unknown = 'test'): FieldRow[] => [
    new FieldRow({
      name: fieldName,
      flattenedValue: fieldValue,
      hit: buildDataTableRecord(
        {
          _ignored: [],
          _index: 'test',
          _id: '1',
          _source: {
            [fieldName]: fieldValue,
          },
        },
        dataViewMockWithTimeField
      ),
      dataView: dataViewMockWithTimeField,
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
        getFieldCellActions({
          rows: getRows(),
          isEsqlMode: false,
          onFilter: undefined,
          onToggleColumn: jest.fn(),
        }).map((item) => item(EuiCellParams))
      ).toMatchSnapshot();

      expect(
        getFieldCellActions({
          rows: getRows(),
          isEsqlMode: false,
          onFilter: undefined,
          onToggleColumn: undefined,
        }).map((item) => item(EuiCellParams))
      ).toMatchSnapshot();
    });

    it('should render the panels correctly for defined onFilter function', () => {
      expect(
        getFieldCellActions({
          rows: getRows(),
          isEsqlMode: false,
          onFilter: jest.fn(),
          onToggleColumn: jest.fn(),
        }).map((item) => item(EuiCellParams))
      ).toMatchSnapshot();
    });
  });

  describe('getFieldValueCellActions', () => {
    it('should render correctly for undefined functions', () => {
      expect(
        getFieldValueCellActions({ rows: getRows(), isEsqlMode: false, onFilter: undefined }).map(
          (item) => item(EuiCellParams)
        )
      ).toMatchSnapshot();
    });

    it('should render the panels correctly for defined onFilter function', () => {
      expect(
        getFieldValueCellActions({ rows: getRows(), isEsqlMode: false, onFilter: jest.fn() }).map(
          (item) => item(EuiCellParams)
        )
      ).toMatchSnapshot();
    });

    it('should allow filtering in ES|QL mode', () => {
      const actions = getFieldValueCellActions({
        rows: getRows('extension'),
        isEsqlMode: true,
        onFilter: jest.fn(),
      }).map((Action, i) => (
        <Action
          key={i}
          {...EuiCellParams}
          Component={(props: any) => (
            <div data-test-subj={props['data-test-subj']}>{JSON.stringify(props)}</div>
          )}
        />
      ));
      render(<>{actions}</>);
      const filterForProps = JSON.parse(
        screen.getByTestId('addFilterForValueButton-extension').innerHTML
      );
      expect(filterForProps.disabled).toBe(false);
      expect(filterForProps.title).toBe('Filter for value');
      const filterOutProps = JSON.parse(
        screen.getByTestId('addFilterOutValueButton-extension').innerHTML
      );
      expect(filterOutProps.disabled).toBe(false);
      expect(filterOutProps.title).toBe('Filter out value');
    });

    it('should not allow filtering in ES|QL mode for multivalue fields', () => {
      const actions = getFieldValueCellActions({
        rows: getRows('extension', ['foo', 'bar']),
        isEsqlMode: true,
        onFilter: jest.fn(),
      }).map((Action, i) => (
        <Action
          key={i}
          {...EuiCellParams}
          Component={(props: any) => (
            <div data-test-subj={props['data-test-subj']}>{JSON.stringify(props)}</div>
          )}
        />
      ));
      render(<>{actions}</>);
      const filterForProps = JSON.parse(
        screen.getByTestId('addFilterForValueButton-extension').innerHTML
      );
      expect(filterForProps.disabled).toBe(true);
      expect(filterForProps.title).toBe('Multivalue filtering is not supported in ES|QL');
      const filterOutProps = JSON.parse(
        screen.getByTestId('addFilterOutValueButton-extension').innerHTML
      );
      expect(filterOutProps.disabled).toBe(true);
      expect(filterOutProps.title).toBe('Multivalue filtering is not supported in ES|QL');
    });
  });
});
