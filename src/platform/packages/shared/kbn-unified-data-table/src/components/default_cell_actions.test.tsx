/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiDataGridColumnCellActionProps } from '@elastic/eui';
import type { DataViewField } from '@kbn/data-views-plugin/public';
import React from 'react';
import userEvent from '@testing-library/user-event';
import {
  buildCellActions,
  buildCopyValueButton,
  FilterInBtn,
  FilterOutBtn,
} from './default_cell_actions';
import { dataTableContextMock } from '../../__mocks__/table_context';
import { EuiButtonEmpty } from '@elastic/eui';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';
import { servicesMock } from '../../__mocks__/services';
import { UnifiedDataTableContext } from '../table_context';

const TestCellActionButton: EuiDataGridColumnCellActionProps['Component'] = EuiButtonEmpty;

const createCellActionProps = (
  props: Partial<EuiDataGridColumnCellActionProps>
): EuiDataGridColumnCellActionProps => ({
  colIndex: 0,
  columnId: 'extension',
  Component: TestCellActionButton,
  isExpanded: false,
  rowIndex: 0,
  ...props,
});

const getField = (fieldName: string): DataViewField => {
  const field = dataTableContextMock.dataView.getFieldByName(fieldName);

  if (!field) throw new Error(`Missing test field "${fieldName}"`);

  return field;
};

describe('Default cell actions ', () => {
  const execCommandMock = (global.document.execCommand = jest.fn());

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const CopyBtn = buildCopyValueButton(
    createCellActionProps({
      colIndex: 0,
      columnId: 'extension',
    }),
    servicesMock.toastNotifications,
    dataTableContextMock.valueToStringConverter
  );
  const extensionField = getField('extension');
  const messageField = getField('message');
  const sourceField = getField('_source');

  it('should not show cell actions for unfilterable fields', () => {
    const cellActions = buildCellActions(
      messageField,
      servicesMock.toastNotifications,
      dataTableContextMock.valueToStringConverter
    );

    expect(cellActions.length).toEqual(1);
    expect(
      cellActions[0](
        createCellActionProps({
          colIndex: 1,
          columnId: 'extension',
        })
      ).props['aria-label']
    ).toEqual(CopyBtn.props['aria-label']);
  });

  it('should show filter actions for filterable fields', () => {
    const cellActions = buildCellActions(
      extensionField,
      servicesMock.toastNotifications,
      dataTableContextMock.valueToStringConverter,
      jest.fn()
    );

    expect(cellActions).toHaveLength(3);
  });

  it('should show Copy action for _source field', () => {
    const cellActions = buildCellActions(
      sourceField,
      servicesMock.toastNotifications,
      dataTableContextMock.valueToStringConverter
    );

    expect(
      cellActions[0](
        createCellActionProps({
          colIndex: 1,
          columnId: 'extension',
        })
      ).props['aria-label']
    ).toEqual(CopyBtn.props['aria-label']);
  });

  it('triggers filter function when FilterInBtn is clicked', async () => {
    renderWithI18n(
      <UnifiedDataTableContext.Provider value={dataTableContextMock}>
        <FilterInBtn
          cellActionProps={{
            Component: TestCellActionButton,
            rowIndex: 1,
            colIndex: 1,
            columnId: 'extension',
            isExpanded: false,
          }}
          field={extensionField}
        />
      </UnifiedDataTableContext.Provider>
    );

    await userEvent.click(screen.getByRole('button', { name: 'Filter for this extension' }));

    expect(dataTableContextMock.onFilter).toHaveBeenCalledWith(extensionField, 'jpg', '+');
  });

  it('triggers filter function when FilterInBtn is clicked for a non-provided value', async () => {
    renderWithI18n(
      <UnifiedDataTableContext.Provider value={dataTableContextMock}>
        <FilterInBtn
          cellActionProps={{
            colIndex: 1,
            columnId: 'extension',
            Component: TestCellActionButton,
            isExpanded: false,
            rowIndex: 0,
          }}
          field={extensionField}
        />
      </UnifiedDataTableContext.Provider>
    );

    await userEvent.click(screen.getByRole('button', { name: 'Filter for this extension' }));

    expect(dataTableContextMock.onFilter).toHaveBeenCalledWith(extensionField, undefined, '+');
  });

  it('triggers filter function when FilterInBtn is clicked for an empty string value', async () => {
    renderWithI18n(
      <UnifiedDataTableContext.Provider value={dataTableContextMock}>
        <FilterInBtn
          cellActionProps={{
            colIndex: 1,
            columnId: 'message',
            Component: TestCellActionButton,
            isExpanded: false,
            rowIndex: 4,
          }}
          field={messageField}
        />
      </UnifiedDataTableContext.Provider>
    );

    await userEvent.click(screen.getByRole('button', { name: 'Filter for this message' }));

    expect(dataTableContextMock.onFilter).toHaveBeenCalledWith(messageField, '', '+');
  });

  it('triggers filter function when FilterOutBtn is clicked', async () => {
    renderWithI18n(
      <UnifiedDataTableContext.Provider value={dataTableContextMock}>
        <FilterOutBtn
          cellActionProps={{
            colIndex: 1,
            columnId: 'extension',
            Component: TestCellActionButton,
            isExpanded: false,
            rowIndex: 1,
          }}
          field={extensionField}
        />
      </UnifiedDataTableContext.Provider>
    );

    await userEvent.click(screen.getByRole('button', { name: 'Filter out this extension' }));

    expect(dataTableContextMock.onFilter).toHaveBeenCalledWith(extensionField, 'jpg', '-');
  });

  it('triggers clipboard copy when CopyBtn is clicked', async () => {
    execCommandMock.mockImplementationOnce(() => true);

    renderWithI18n(
      <UnifiedDataTableContext.Provider value={dataTableContextMock}>
        {buildCopyValueButton(
          createCellActionProps({
            colIndex: 1,
            columnId: 'extension',
            rowIndex: 1,
          }),
          servicesMock.toastNotifications,
          dataTableContextMock.valueToStringConverter
        )}
      </UnifiedDataTableContext.Provider>
    );

    await userEvent.click(screen.getByRole('button', { name: 'Copy value of extension' }));

    expect(execCommandMock).toHaveBeenCalledWith('copy');
    expect(servicesMock.toastNotifications.addInfo).toHaveBeenCalledWith({
      title: 'Copied to clipboard',
    });
  });
});
