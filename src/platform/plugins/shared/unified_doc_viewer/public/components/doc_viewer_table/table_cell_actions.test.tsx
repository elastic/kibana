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
import type { TableGridCellAction, TableGridCellActionDefinition } from './table_grid/model';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  copyToClipboard: jest.fn(),
}));

const mockCopyToClipboard = jest.mocked(copyToClipboard);
const toastsMock = notificationServiceMock.createSetupContract().toasts;

const getRow = (fieldName = 'message', fieldValue: unknown = 'test'): FieldRow =>
  new FieldRow({
    name: fieldName,
    flattenedValue: fieldValue,
    hit: buildDataTableRecord(
      {
        _ignored: [],
        _index: 'test',
        _id: '1',
        _source: { [fieldName]: fieldValue },
      },
      dataViewMockWithTimeField
    ),
    dataView: dataViewMockWithTimeField,
    fieldFormats: {} as FieldFormatsStart,
    isPinned: false,
    dataSource: undefined,
  });

const resolveActions = (
  definitions: Array<TableGridCellActionDefinition<FieldRow>>,
  row: FieldRow,
  columnId: string
): TableGridCellAction[] =>
  definitions
    .map(({ resolve }) => resolve({ row, rowId: row.name, columnId }))
    .filter((action): action is TableGridCellAction => action !== undefined);

const renderActions = (actions: TableGridCellAction[]) =>
  render(
    <>
      {actions.map((action) => (
        <button key={action.id} data-test-subj={action.dataTestSubj} onClick={action.onExecute}>
          {action.label}
        </button>
      ))}
    </>
  );

afterEach(() => {
  jest.clearAllMocks();
});

describe('TableActions', () => {
  describe('getFieldCellActions', () => {
    it('describes only the available actions', () => {
      const row = getRow();

      expect(
        resolveActions(
          getFieldCellActions({ onFilter: undefined, onToggleColumn: undefined }),
          row,
          'name'
        )
      ).toEqual([]);

      expect(
        resolveActions(
          getFieldCellActions({ onFilter: undefined, onToggleColumn: jest.fn() }),
          row,
          'name'
        ).map(({ id, label, dataTestSubj }) => ({ id, label, dataTestSubj }))
      ).toEqual([
        {
          id: 'toggle-column',
          label: 'Toggle column in table',
          dataTestSubj: 'toggleColumnButton-message',
        },
      ]);
    });

    it('executes filter-exists using the stable field identity', async () => {
      const row = getRow('extension');
      const onFilter = jest.fn();
      const actions = resolveActions(
        getFieldCellActions({ onFilter, onToggleColumn: undefined }),
        row,
        'name'
      );
      renderActions(actions);

      await userEvent.click(screen.getByRole('button', { name: 'Filter for field present' }));

      expect(onFilter).toHaveBeenCalledWith('_exists_', 'extension', '+');
    });

    it('does not expose filter-exists for scripted fields', () => {
      const row = getRow();
      Object.defineProperty(row, 'dataViewField', {
        value: { ...row.dataViewField!, scripted: true } as DataViewField,
        writable: true,
        configurable: true,
      });

      const actions = resolveActions(
        getFieldCellActions({ onFilter: jest.fn(), onToggleColumn: undefined }),
        row,
        'name'
      );

      expect(actions).toEqual([]);
    });
  });

  describe('getFieldValueCellActions', () => {
    it('describes copy when filtering is unavailable', () => {
      const actions = resolveActions(
        getFieldValueCellActions({ onFilter: undefined, toasts: toastsMock }),
        getRow(),
        'value'
      );

      expect(actions.map(({ id, label, dataTestSubj }) => ({ id, label, dataTestSubj }))).toEqual([
        {
          id: 'copy-value',
          label: 'Copy value',
          dataTestSubj: 'copyValueButton-message',
        },
      ]);
    });

    it('does not expose filter actions for computed columns when filtering is disabled', () => {
      const row = getRow();
      Object.defineProperty(row, 'dataViewField', {
        value: { ...row.dataViewField!, isComputedColumn: true },
        writable: true,
        configurable: true,
      });

      const actions = resolveActions(
        getFieldValueCellActions({
          onFilter: jest.fn(),
          toasts: toastsMock,
          hideFilteringOnComputedColumns: true,
        }),
        row,
        'value'
      );

      expect(actions.map(({ id }) => id)).toEqual(['copy-value']);
    });

    it.each([
      ['a URL', 'https://www.elastic.co/downloads/beats/filebeat'],
      ['a value with quotes', 'Large "capybara"'],
      ['a value starting with a formula character', '=HYPERLINK("https://example.com")'],
    ])('copies %s without CSV escaping', async (_name, value) => {
      const actions = resolveActions(
        getFieldValueCellActions({ onFilter: undefined, toasts: toastsMock }),
        getRow('message', value),
        'value'
      );
      renderActions(actions);

      await userEvent.click(screen.getByRole('button', { name: 'Copy value' }));

      expect(mockCopyToClipboard).toHaveBeenCalledWith(value);
    });

    it('shows a warning toast when copying fails', async () => {
      mockCopyToClipboard.mockReturnValue(false);
      const actions = resolveActions(
        getFieldValueCellActions({ onFilter: undefined, toasts: toastsMock }),
        getRow(),
        'value'
      );
      renderActions(actions);

      await userEvent.click(screen.getByRole('button', { name: 'Copy value' }));

      expect(toastsMock.addWarning).toHaveBeenCalledTimes(1);
    });

    it('shows an info toast when copying succeeds', async () => {
      mockCopyToClipboard.mockReturnValue(true);
      const actions = resolveActions(
        getFieldValueCellActions({ onFilter: undefined, toasts: toastsMock }),
        getRow(),
        'value'
      );
      renderActions(actions);

      await userEvent.click(screen.getByRole('button', { name: 'Copy value' }));

      expect(toastsMock.addInfo).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['Filter for value', '+'],
      ['Filter out value', '-'],
    ] as const)('executes %s with the row value', async (label, operator) => {
      const onFilter = jest.fn();
      const row = getRow('extension', ['foo', 'bar']);
      const actions = resolveActions(
        getFieldValueCellActions({ onFilter, toasts: toastsMock }),
        row,
        'value'
      );
      renderActions(actions);

      await userEvent.click(screen.getByRole('button', { name: label }));

      expect(onFilter).toHaveBeenCalledWith(row.dataViewField, ['foo', 'bar'], operator);
    });
  });

  describe('getFilterInOutPairDisabledWarning', () => {
    it('returns undefined when row is undefined', () => {
      expect(
        getFilterInOutPairDisabledWarning({
          row: undefined,
          onFilter: jest.fn(),
          hideFilteringOnComputedColumns: false,
        })
      ).toBeUndefined();
    });

    it('returns a warning for ignored fields', () => {
      const row = getRow();
      Object.defineProperty(row, 'ignoredReason', {
        value: 'field_ignored',
        writable: true,
        configurable: true,
      });

      expect(
        getFilterInOutPairDisabledWarning({
          row,
          onFilter: jest.fn(),
          hideFilteringOnComputedColumns: false,
        })
      ).toBe('Ignored values cannot be searched');
    });

    it('returns a warning for unindexed fields', () => {
      const row = getRow();
      Object.defineProperty(row, 'dataViewField', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      expect(
        getFilterInOutPairDisabledWarning({
          row,
          onFilter: jest.fn(),
          hideFilteringOnComputedColumns: false,
        })
      ).toBe('Unindexed fields cannot be searched');
    });

    it('returns undefined when filtering is enabled or unavailable', () => {
      const row = getRow();
      expect(
        getFilterInOutPairDisabledWarning({
          row,
          onFilter: jest.fn(),
          hideFilteringOnComputedColumns: false,
        })
      ).toBeUndefined();
      expect(
        getFilterInOutPairDisabledWarning({
          row,
          onFilter: undefined,
          hideFilteringOnComputedColumns: false,
        })
      ).toBeUndefined();
    });
  });

  describe('getFilterExistsDisabledWarning', () => {
    it('returns undefined when row is undefined', () => {
      expect(
        getFilterExistsDisabledWarning({
          row: undefined,
          onFilter: jest.fn(),
          hideFilteringOnComputedColumns: false,
        })
      ).toBeUndefined();
    });

    it('returns a warning for scripted fields', () => {
      const row = getRow();
      Object.defineProperty(row, 'dataViewField', {
        value: { ...row.dataViewField!, scripted: true } as DataViewField,
        writable: true,
        configurable: true,
      });

      expect(
        getFilterExistsDisabledWarning({
          row,
          onFilter: jest.fn(),
          hideFilteringOnComputedColumns: false,
        })
      ).toBe('Unable to filter for presence of scripted fields');
    });

    it('returns undefined when filtering is enabled or unavailable', () => {
      const row = getRow();
      expect(
        getFilterExistsDisabledWarning({
          row,
          onFilter: jest.fn(),
          hideFilteringOnComputedColumns: false,
        })
      ).toBeUndefined();
      expect(
        getFilterExistsDisabledWarning({
          row,
          onFilter: undefined,
          hideFilteringOnComputedColumns: false,
        })
      ).toBeUndefined();
    });
  });
});
