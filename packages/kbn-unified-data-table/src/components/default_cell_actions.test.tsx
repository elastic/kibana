/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const mockCopyToClipboard = jest.fn((value) => true);
jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    copyToClipboard: (value: string) => mockCopyToClipboard(value),
  };
});

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { findTestSubject } from '@elastic/eui/lib/test';
import {
  FilterInBtn,
  FilterOutBtn,
  buildCellActions,
  buildCopyValueButton,
} from './default_cell_actions';
import { servicesMock } from '../../__mocks__/services';
import { UnifiedDataTableContext } from '../table_context';
import { EuiButton, EuiDataGridColumnCellActionProps } from '@elastic/eui';
import { dataTableContextMock } from '../../__mocks__/table_context';
import { DataViewField } from '@kbn/data-views-plugin/public';

describe('Default cell actions ', function () {
  const CopyBtn = buildCopyValueButton(
    {
      Component: () => <></>,
      colIndex: 0,
      columnId: 'extension',
    } as unknown as EuiDataGridColumnCellActionProps,
    servicesMock.toastNotifications,
    dataTableContextMock.valueToStringConverter
  );

  it('should not show cell actions for unfilterable fields', async () => {
    const cellActions = buildCellActions(
      { name: 'foo', filterable: false } as DataViewField,
      false,
      servicesMock.toastNotifications,
      dataTableContextMock.valueToStringConverter
    );
    expect(cellActions.length).toEqual(1);
    expect(
      cellActions[0]({
        Component: () => <></>,
        colIndex: 1,
        columnId: 'extension',
      } as unknown as EuiDataGridColumnCellActionProps).props['aria-label']
    ).toEqual(CopyBtn.props['aria-label']);
  });

  it('should show filter actions for filterable fields', async () => {
    const cellActions = buildCellActions(
      { name: 'foo', filterable: true } as DataViewField,
      false,
      servicesMock.toastNotifications,
      dataTableContextMock.valueToStringConverter,
      jest.fn()
    );
    expect(cellActions).toHaveLength(3);
  });

  it('should show Copy action for _source field', async () => {
    const cellActions = buildCellActions(
      { name: '_source', type: '_source', filterable: false } as DataViewField,
      false,
      servicesMock.toastNotifications,
      dataTableContextMock.valueToStringConverter
    );
    expect(
      cellActions[0]({
        Component: () => <></>,
        colIndex: 1,
        columnId: 'extension',
      } as unknown as EuiDataGridColumnCellActionProps).props['aria-label']
    ).toEqual(CopyBtn.props['aria-label']);
  });

  it('triggers filter function when FilterInBtn is clicked', async () => {
    const component = mountWithIntl(
      <UnifiedDataTableContext.Provider value={dataTableContextMock}>
        <FilterInBtn
          cellActionProps={{
            Component: (props: any) => <EuiButton {...props} />,
            rowIndex: 1,
            colIndex: 1,
            columnId: 'extension',
            isExpanded: false,
          }}
          field={{ name: 'extension', filterable: true } as DataViewField}
          isPlainRecord={false}
        />
      </UnifiedDataTableContext.Provider>
    );
    const button = findTestSubject(component, 'filterForButton');
    await button.simulate('click');
    expect(dataTableContextMock.onFilter).toHaveBeenCalledWith(
      { name: 'extension', filterable: true },
      'jpg',
      '+'
    );
  });
  it('triggers filter function when FilterInBtn is clicked for a non-provided value', async () => {
    const component = mountWithIntl(
      <UnifiedDataTableContext.Provider value={dataTableContextMock}>
        <FilterInBtn
          cellActionProps={{
            Component: (props: any) => <EuiButton {...props} />,
            rowIndex: 0,
            colIndex: 1,
            columnId: 'extension',
            isExpanded: false,
          }}
          field={{ name: 'extension', filterable: true } as DataViewField}
          isPlainRecord={false}
        />
      </UnifiedDataTableContext.Provider>
    );
    const button = findTestSubject(component, 'filterForButton');
    await button.simulate('click');
    expect(dataTableContextMock.onFilter).toHaveBeenCalledWith(
      { name: 'extension', filterable: true },
      undefined,
      '+'
    );
  });
  it('triggers filter function when FilterInBtn is clicked for an empty string value', async () => {
    const component = mountWithIntl(
      <UnifiedDataTableContext.Provider value={dataTableContextMock}>
        <FilterInBtn
          cellActionProps={{
            Component: (props: any) => <EuiButton {...props} />,
            rowIndex: 4,
            colIndex: 1,
            columnId: 'message',
            isExpanded: false,
          }}
          field={{ name: 'message', filterable: true } as DataViewField}
          isPlainRecord={false}
        />
      </UnifiedDataTableContext.Provider>
    );
    const button = findTestSubject(component, 'filterForButton');
    await button.simulate('click');
    expect(dataTableContextMock.onFilter).toHaveBeenCalledWith(
      { name: 'message', filterable: true },
      '',
      '+'
    );
  });
  it('triggers filter function when FilterOutBtn is clicked', async () => {
    const component = mountWithIntl(
      <UnifiedDataTableContext.Provider value={dataTableContextMock}>
        <FilterOutBtn
          cellActionProps={{
            Component: (props: any) => <EuiButton {...props} />,
            rowIndex: 1,
            colIndex: 1,
            columnId: 'extension',
            isExpanded: false,
          }}
          field={{ name: 'extension', filterable: true } as DataViewField}
          isPlainRecord={false}
        />
      </UnifiedDataTableContext.Provider>
    );
    const button = findTestSubject(component, 'filterOutButton');
    await button.simulate('click');
    expect(dataTableContextMock.onFilter).toHaveBeenCalledWith(
      { name: 'extension', filterable: true },
      'jpg',
      '-'
    );
  });
  it('triggers clipboard copy when CopyBtn is clicked', async () => {
    const component = mountWithIntl(
      <UnifiedDataTableContext.Provider value={dataTableContextMock}>
        {buildCopyValueButton(
          {
            Component: (props: any) => <EuiButton {...props} />,
            colIndex: 1,
            rowIndex: 1,
            columnId: 'extension',
          } as unknown as EuiDataGridColumnCellActionProps,
          servicesMock.toastNotifications,
          dataTableContextMock.valueToStringConverter
        )}
      </UnifiedDataTableContext.Provider>
    );
    const button = findTestSubject(component, 'copyClipboardButton');
    await button.simulate('click');
    expect(mockCopyToClipboard).toHaveBeenCalledWith('jpg');
  });
});
