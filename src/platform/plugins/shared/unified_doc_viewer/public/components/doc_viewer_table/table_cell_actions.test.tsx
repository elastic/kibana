/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import {
  getFieldCellActions,
  getFieldValueCellActions,
  getFilterInOutPairDisabledWarning,
  getFilterExistsDisabledWarning,
} from './table_cell_actions';
import { FieldRow } from './field_row';
import { buildDataTableRecord } from '@kbn/discover-utils';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { dataViewMockWithTimeField } from '@kbn/discover-utils/src/__mocks__';
import { copyToClipboard } from '@elastic/eui';
import { notificationServiceMock } from '@kbn/core/public/mocks';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  copyToClipboard: jest.fn(),
}));
const mockCopyToClipboard = jest.mocked(copyToClipboard);

const toastsMock = notificationServiceMock.createSetupContract().toasts;

afterEach(() => {
  jest.clearAllMocks();
});

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
        getFieldValueCellActions({
          rows: getRows(),
          isEsqlMode: false,
          onFilter: undefined,
          toasts: toastsMock,
        }).map((item) => item(EuiCellParams))
      ).toMatchSnapshot();
    });

    it('should render correctly for hideFilteringOnComputedColumns set to true', () => {
      const rowsWithComputedColumn = getRows();
      // Mock the dataViewField to have isComputedColumn set to true
      Object.defineProperty(rowsWithComputedColumn[0], 'dataViewField', {
        value: {
          ...rowsWithComputedColumn[0].dataViewField!,
          isComputedColumn: true,
        },
        writable: true,
        configurable: true,
      });

      expect(
        getFieldValueCellActions({
          rows: rowsWithComputedColumn,
          isEsqlMode: false,
          onFilter: jest.fn(),
          toasts: toastsMock,
          hideFilteringOnComputedColumns: true,
        }).map((item) => item(EuiCellParams))
      ).toMatchSnapshot();
    });

    it('should render the panels correctly for defined onFilter function', () => {
      expect(
        getFieldValueCellActions({
          rows: getRows(),
          isEsqlMode: false,
          onFilter: jest.fn(),
          toasts: toastsMock,
        }).map((item) => item(EuiCellParams))
      ).toMatchSnapshot();
    });

    describe('when clicking "Copy value"', () => {
      beforeEach(() => {
        const actions = getFieldValueCellActions({
          rows: getRows(),
          toasts: toastsMock,
          isEsqlMode: false,
          onFilter: undefined,
        }).map((Action, i) => (
          <Action
            key={i}
            {...EuiCellParams}
            Component={(props: any) => <div {...props}>{props.children}</div>}
          />
        ));

        render(<>{actions}</>);
      });

      it('should call the copy function', async () => {
        // When
        const user = userEvent.setup();
        await user.click(screen.getByText('Copy value'));

        // Then
        expect(mockCopyToClipboard).toHaveBeenCalledWith(EuiCellParams.columnId);
      });

      describe('when the copy fails', () => {
        it('should show a warning toast', async () => {
          // Given
          mockCopyToClipboard.mockReturnValue(false);
          const user = userEvent.setup();

          // When
          await user.click(screen.getByText('Copy value'));

          // Then
          expect(toastsMock.addWarning).toHaveBeenCalledTimes(1);
        });
      });

      describe('when the copy succeeds', () => {
        it('should show an info toast', async () => {
          // Given
          mockCopyToClipboard.mockReturnValue(true);
          const user = userEvent.setup();

          // When
          await user.click(screen.getByText('Copy value'));

          // Then
          expect(toastsMock.addInfo).toHaveBeenCalledTimes(1);
        });
      });
    });

    it('should allow filtering in ES|QL mode', () => {
      const actions = getFieldValueCellActions({
        rows: getRows('extension'),
        isEsqlMode: true,
        toasts: toastsMock,
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
      expect(filterForProps.title).toBe('Filter for value');
      const filterOutProps = JSON.parse(
        screen.getByTestId('addFilterOutValueButton-extension').innerHTML
      );
      expect(filterOutProps.title).toBe('Filter out value');
    });

    it('should allow filtering in ES|QL mode for multivalue fields', () => {
      const actions = getFieldValueCellActions({
        rows: getRows('extension', ['foo', 'bar']),
        isEsqlMode: true,
        toasts: toastsMock,
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
      expect(filterForProps.title).toBe('Filter for value');
      const filterOutProps = JSON.parse(
        screen.getByTestId('addFilterOutValueButton-extension').innerHTML
      );
      expect(filterOutProps.title).toBe('Filter out value');
    });

    describe('when clicking filter actions', () => {
      it('should call onFilter with correct params for FilterIn action', async () => {
        const onFilterMock = jest.fn();
        const actions = getFieldValueCellActions({
          rows: getRows('extension', 'test-value'),
          isEsqlMode: false,
          toasts: toastsMock,
          onFilter: onFilterMock,
        }).map((Action, i) => (
          <Action
            key={i}
            {...EuiCellParams}
            Component={(props: any) => <button {...props}>{props.children}</button>}
          />
        ));

        render(<>{actions}</>);
        const user = userEvent.setup();
        await user.click(screen.getByText('Filter for value'));

        expect(onFilterMock).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'extension',
          }),
          'test-value',
          '+'
        );
      });

      it('should call onFilter with correct params for FilterOut action', async () => {
        const onFilterMock = jest.fn();
        const actions = getFieldValueCellActions({
          rows: getRows('extension', 'test-value'),
          isEsqlMode: false,
          toasts: toastsMock,
          onFilter: onFilterMock,
        }).map((Action, i) => (
          <Action
            key={i}
            {...EuiCellParams}
            Component={(props: any) => <button {...props}>{props.children}</button>}
          />
        ));

        render(<>{actions}</>);
        const user = userEvent.setup();
        await user.click(screen.getByText('Filter out value'));

        expect(onFilterMock).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'extension',
          }),
          'test-value',
          '-'
        );
      });
    });

    describe('when row is undefined', () => {
      it('should not render any actions', () => {
        // Create rows array with undefined element
        const actions = getFieldValueCellActions({
          rows: [undefined as any],
          isEsqlMode: false,
          toasts: toastsMock,
          onFilter: jest.fn(),
        }).map((Action, i) => (
          <Action
            key={i}
            {...EuiCellParams}
            Component={(props: any) => (
              <div data-test-subj={props['data-test-subj']}>{props.children}</div>
            )}
          />
        ));

        render(<>{actions}</>);
        expect(screen.queryByText('Copy value')).not.toBeInTheDocument();
        expect(screen.queryByText('Filter for value')).not.toBeInTheDocument();
        expect(screen.queryByText('Filter out value')).not.toBeInTheDocument();
      });
    });
  });

  describe('getFieldCellActions filter exists action', () => {
    it('should call onFilter with "_exists_" when clicking filter exists', async () => {
      const onFilterMock = jest.fn();
      const actions = getFieldCellActions({
        rows: getRows('extension'),
        isEsqlMode: false,
        onFilter: onFilterMock,
        onToggleColumn: jest.fn(),
      }).map((Action, i) => (
        <Action
          key={i}
          {...EuiCellParams}
          Component={(props: any) => <button {...props}>{props.children}</button>}
        />
      ));

      render(<>{actions}</>);
      const user = userEvent.setup();
      await user.click(screen.getByText('Filter for field present'));

      expect(onFilterMock).toHaveBeenCalledWith('_exists_', 'extension', '+');
    });

    it('should not render filter exists for scripted fields', () => {
      const rowsWithScriptedField = getRows();
      Object.defineProperty(rowsWithScriptedField[0], 'dataViewField', {
        value: {
          ...rowsWithScriptedField[0].dataViewField!,
          scripted: true,
        } as DataViewField,
        writable: true,
        configurable: true,
      });

      const actions = getFieldCellActions({
        rows: rowsWithScriptedField,
        isEsqlMode: false,
        onFilter: jest.fn(),
        onToggleColumn: jest.fn(),
      }).map((Action, i) => (
        <Action
          key={i}
          {...EuiCellParams}
          Component={(props: any) => (
            <div data-test-subj={props['data-test-subj']}>{props.children}</div>
          )}
        />
      ));

      render(<>{actions}</>);
      expect(screen.queryByText('Filter for field present')).not.toBeInTheDocument();
    });
  });

  describe('getFilterInOutPairDisabledWarning', () => {
    it('should return undefined when row is undefined', () => {
      const warning = getFilterInOutPairDisabledWarning({
        row: undefined,
        onFilter: jest.fn(),
        hideFilteringOnComputedColumns: false,
      });
      expect(warning).toBeUndefined();
    });

    it('should return warning for ignored fields', () => {
      const rows = getRows();
      Object.defineProperty(rows[0], 'ignoredReason', {
        value: 'field_ignored',
        writable: true,
        configurable: true,
      });

      const warning = getFilterInOutPairDisabledWarning({
        row: rows[0],
        onFilter: jest.fn(),
        hideFilteringOnComputedColumns: false,
      });
      expect(warning).toBe('Ignored values cannot be searched');
    });

    it('should return warning for unindexed fields', () => {
      const rows = getRows();
      Object.defineProperty(rows[0], 'dataViewField', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const warning = getFilterInOutPairDisabledWarning({
        row: rows[0],
        onFilter: jest.fn(),
        hideFilteringOnComputedColumns: false,
      });
      expect(warning).toBe('Unindexed fields cannot be searched');
    });

    it('should return undefined when filtering is enabled', () => {
      const rows = getRows();
      const warning = getFilterInOutPairDisabledWarning({
        row: rows[0],
        onFilter: jest.fn(),
        hideFilteringOnComputedColumns: false,
      });
      expect(warning).toBeUndefined();
    });

    it('should return undefined when onFilter is not provided', () => {
      const rows = getRows();
      const warning = getFilterInOutPairDisabledWarning({
        row: rows[0],
        onFilter: undefined,
        hideFilteringOnComputedColumns: false,
      });
      expect(warning).toBeUndefined();
    });
  });

  describe('getFilterExistsDisabledWarning', () => {
    it('should return undefined when row is undefined', () => {
      const warning = getFilterExistsDisabledWarning({
        row: undefined,
        onFilter: jest.fn(),
        hideFilteringOnComputedColumns: false,
      });
      expect(warning).toBeUndefined();
    });

    it('should return warning for scripted fields', () => {
      const rows = getRows();
      Object.defineProperty(rows[0], 'dataViewField', {
        value: {
          ...rows[0].dataViewField!,
          scripted: true,
        } as DataViewField,
        writable: true,
        configurable: true,
      });

      const warning = getFilterExistsDisabledWarning({
        row: rows[0],
        onFilter: jest.fn(),
        hideFilteringOnComputedColumns: false,
      });
      expect(warning).toBe('Unable to filter for presence of scripted fields');
    });

    it('should return undefined when filtering is enabled', () => {
      const rows = getRows();
      const warning = getFilterExistsDisabledWarning({
        row: rows[0],
        onFilter: jest.fn(),
        hideFilteringOnComputedColumns: false,
      });
      expect(warning).toBeUndefined();
    });

    it('should return undefined when onFilter is not provided', () => {
      const rows = getRows();
      const warning = getFilterExistsDisabledWarning({
        row: rows[0],
        onFilter: undefined,
        hideFilteringOnComputedColumns: false,
      });
      expect(warning).toBeUndefined();
    });
  });
});
