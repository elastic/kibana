/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { findTestSubject } from '@elastic/eui/lib/test';
import {
  DataTableCompareToolbarBtn,
  DataTableDocumentToolbarBtn,
  SelectButton,
  getSelectAllButton,
} from './data_table_document_selection';
import {
  buildSelectedDocsState,
  dataTableContextMock,
  dataTableContextRowsMock,
} from '../../__mocks__/table_context';
import { UnifiedDataTableContext } from '../table_context';
import { getDocId } from '@kbn/discover-utils';
import { render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { servicesMock } from '../../__mocks__/services';

describe('document selection', () => {
  describe('getDocId', () => {
    test('doc with custom routing', () => {
      const doc = {
        _id: 'test-id',
        _index: 'test-indices',
        _routing: 'why-not',
      };
      expect(getDocId(doc)).toMatchInlineSnapshot(`"test-indices::test-id::why-not"`);
    });

    test('doc without custom routing', () => {
      const doc = {
        _id: 'test-id',
        _index: 'test-indices',
      };
      expect(getDocId(doc)).toMatchInlineSnapshot(`"test-indices::test-id::"`);
    });
  });

  describe('SelectAllButton', () => {
    test('is not checked', () => {
      const contextMock = {
        ...dataTableContextMock,
      };
      const SelectAllButton = getSelectAllButton(dataTableContextRowsMock);

      const component = mountWithIntl(
        <UnifiedDataTableContext.Provider value={contextMock}>
          <SelectAllButton />
        </UnifiedDataTableContext.Provider>
      );

      const checkBox = findTestSubject(component, 'selectAllDocsOnPageToggle');
      expect(checkBox.props().checked).toBeFalsy();
    });

    test('is checked correctly', () => {
      const contextMock = {
        ...dataTableContextMock,
        selectedDocsState: buildSelectedDocsState(['i::1::']),
      };
      const SelectAllButton = getSelectAllButton(dataTableContextRowsMock);

      const component = mountWithIntl(
        <UnifiedDataTableContext.Provider value={contextMock}>
          <SelectAllButton />
        </UnifiedDataTableContext.Provider>
      );

      const checkBox = findTestSubject(component, 'selectAllDocsOnPageToggle');
      expect(checkBox.props().checked).toBeTruthy();
    });
  });

  describe('SelectButton', () => {
    test('is not checked', () => {
      const contextMock = {
        ...dataTableContextMock,
      };

      const component = mountWithIntl(
        <UnifiedDataTableContext.Provider value={contextMock}>
          <SelectButton
            rowIndex={0}
            colIndex={0}
            setCellProps={jest.fn()}
            columnId="test"
            isExpanded={false}
            isDetails={false}
            isExpandable={false}
          />
        </UnifiedDataTableContext.Provider>
      );

      const checkBox = findTestSubject(component, 'dscGridSelectDoc-i::1::');
      expect(checkBox.props().checked).toBeFalsy();
    });

    test('is checked correctly', () => {
      const contextMock = {
        ...dataTableContextMock,
        selectedDocsState: buildSelectedDocsState(['i::1::']),
      };

      const component1 = mountWithIntl(
        <UnifiedDataTableContext.Provider value={contextMock}>
          <SelectButton
            rowIndex={0}
            colIndex={0}
            setCellProps={jest.fn()}
            columnId="test"
            isExpanded={false}
            isDetails={false}
            isExpandable={false}
          />
        </UnifiedDataTableContext.Provider>
      );

      const checkBox1 = findTestSubject(component1, 'dscGridSelectDoc-i::1::');
      expect(checkBox1.props().checked).toBeTruthy();

      const component2 = mountWithIntl(
        <UnifiedDataTableContext.Provider value={contextMock}>
          <SelectButton
            rowIndex={1}
            colIndex={0}
            setCellProps={jest.fn()}
            columnId="test"
            isExpanded={false}
            isDetails={false}
            isExpandable={false}
          />
        </UnifiedDataTableContext.Provider>
      );

      const checkBox2 = findTestSubject(component2, 'dscGridSelectDoc-i::2::');
      expect(checkBox2.props().checked).toBeFalsy();
    });

    test('adding a selection', () => {
      const contextMock = {
        ...dataTableContextMock,
      };

      const component = mountWithIntl(
        <UnifiedDataTableContext.Provider value={contextMock}>
          <SelectButton
            rowIndex={0}
            colIndex={0}
            setCellProps={jest.fn()}
            columnId="test"
            isExpanded={false}
            isDetails={false}
            isExpandable={false}
          />
        </UnifiedDataTableContext.Provider>
      );

      const checkBox = findTestSubject(component, 'dscGridSelectDoc-i::1::');
      checkBox.simulate('change');
      expect(contextMock.selectedDocsState.toggleDocSelection).toHaveBeenCalledWith('i::1::');
    });

    test('removing a selection', () => {
      const contextMock = {
        ...dataTableContextMock,
        selectedDocsState: buildSelectedDocsState(['i::1::']),
      };

      const component = mountWithIntl(
        <UnifiedDataTableContext.Provider value={contextMock}>
          <SelectButton
            rowIndex={0}
            colIndex={0}
            setCellProps={jest.fn()}
            columnId="test"
            isExpanded={false}
            isDetails={false}
            isExpandable={false}
          />
        </UnifiedDataTableContext.Provider>
      );

      const checkBox = findTestSubject(component, 'dscGridSelectDoc-i::1::');
      checkBox.simulate('change');
      expect(contextMock.selectedDocsState.toggleDocSelection).toHaveBeenCalledWith('i::1::');
    });
  });

  describe('DataTableDocumentToolbarBtn', () => {
    test('it renders the button and its menu correctly', () => {
      const props = {
        isPlainRecord: false,
        isFilterActive: false,
        rows: dataTableContextRowsMock,
        selectedDocsState: buildSelectedDocsState(['i::1::', 'i::2::']),
        setIsFilterActive: jest.fn(),
        enableComparisonMode: true,
        setIsCompareActive: jest.fn(),
        fieldFormats: servicesMock.fieldFormats,
        pageIndex: 0,
        pageSize: 2,
        toastNotifications: servicesMock.toastNotifications,
        columns: ['test'],
      };
      const contextMock = {
        ...dataTableContextMock,
        selectedDocsState: props.selectedDocsState,
      };
      const component = mountWithIntl(
        <UnifiedDataTableContext.Provider value={contextMock}>
          <DataTableDocumentToolbarBtn {...props} />
        </UnifiedDataTableContext.Provider>
      );
      const button = findTestSubject(component, 'unifiedDataTableSelectionBtn');
      expect(button.length).toBe(1);
      expect(button.text()).toBe('Selected2');

      act(() => {
        button.simulate('click');
      });

      component.update();

      expect(findTestSubject(component, 'dscGridShowSelectedDocuments').length).toBe(1);
      expect(findTestSubject(component, 'unifiedDataTableCompareSelectedDocuments').length).toBe(1);
      expect(findTestSubject(component, 'dscGridSelectAllDocs').text()).toBe('Select all 5');

      act(() => {
        findTestSubject(component, 'dscGridClearSelectedDocuments').simulate('click');
      });

      expect(props.selectedDocsState.clearAllSelectedDocs).toHaveBeenCalled();
    });

    test('it should not render "Select all X" button if less than pageSize is selected', () => {
      const props = {
        isPlainRecord: false,
        isFilterActive: false,
        rows: dataTableContextRowsMock,
        selectedDocsState: buildSelectedDocsState(['i::1::']),
        setIsFilterActive: jest.fn(),
        enableComparisonMode: true,
        setIsCompareActive: jest.fn(),
        fieldFormats: servicesMock.fieldFormats,
        pageIndex: 0,
        pageSize: 2,
        toastNotifications: servicesMock.toastNotifications,
        columns: ['test'],
      };
      const contextMock = {
        ...dataTableContextMock,
        selectedDocsState: props.selectedDocsState,
      };
      const component = mountWithIntl(
        <UnifiedDataTableContext.Provider value={contextMock}>
          <DataTableDocumentToolbarBtn {...props} />
        </UnifiedDataTableContext.Provider>
      );
      expect(findTestSubject(component, 'unifiedDataTableSelectionBtn').text()).toBe('Selected1');

      expect(findTestSubject(component, 'dscGridSelectAllDocs').exists()).toBe(false);
    });

    test('it should render "Select all X" button if all rows on the page are selected', () => {
      const props = {
        isPlainRecord: false,
        isFilterActive: false,
        rows: dataTableContextRowsMock,
        selectedDocsState: buildSelectedDocsState(['i::1::', 'i::2::']),
        setIsFilterActive: jest.fn(),
        enableComparisonMode: true,
        setIsCompareActive: jest.fn(),
        fieldFormats: servicesMock.fieldFormats,
        pageIndex: 0,
        pageSize: 2,
        toastNotifications: servicesMock.toastNotifications,
        columns: ['test'],
      };
      const contextMock = {
        ...dataTableContextMock,
        selectedDocsState: props.selectedDocsState,
      };
      const component = mountWithIntl(
        <UnifiedDataTableContext.Provider value={contextMock}>
          <DataTableDocumentToolbarBtn {...props} />
        </UnifiedDataTableContext.Provider>
      );
      expect(findTestSubject(component, 'unifiedDataTableSelectionBtn').text()).toBe('Selected2');

      const button = findTestSubject(component, 'dscGridSelectAllDocs');
      expect(button.exists()).toBe(true);

      act(() => {
        button.simulate('click');
      });

      expect(props.selectedDocsState.selectAllDocs).toHaveBeenCalled();
    });

    test('it should render "Select all X" button even if on another page', () => {
      const props = {
        isPlainRecord: false,
        isFilterActive: false,
        rows: dataTableContextRowsMock,
        selectedDocsState: buildSelectedDocsState(['i::1::', 'i::2::']),
        setIsFilterActive: jest.fn(),
        enableComparisonMode: true,
        setIsCompareActive: jest.fn(),
        fieldFormats: servicesMock.fieldFormats,
        pageIndex: 1,
        pageSize: 2,
        toastNotifications: servicesMock.toastNotifications,
        columns: ['test'],
      };
      const contextMock = {
        ...dataTableContextMock,
        selectedDocsState: props.selectedDocsState,
      };
      const component = mountWithIntl(
        <UnifiedDataTableContext.Provider value={contextMock}>
          <DataTableDocumentToolbarBtn {...props} />
        </UnifiedDataTableContext.Provider>
      );
      expect(findTestSubject(component, 'unifiedDataTableSelectionBtn').text()).toBe('Selected2');

      expect(findTestSubject(component, 'dscGridSelectAllDocs').exists()).toBe(true);
    });

    test('it should not render "Select all X" button if all rows are selected', () => {
      const props = {
        isPlainRecord: false,
        isFilterActive: false,
        rows: dataTableContextRowsMock,
        selectedDocsState: buildSelectedDocsState(dataTableContextRowsMock.map((row) => row.id)),
        setIsFilterActive: jest.fn(),
        enableComparisonMode: true,
        setIsCompareActive: jest.fn(),
        fieldFormats: servicesMock.fieldFormats,
        pageIndex: 1,
        pageSize: 2,
        toastNotifications: servicesMock.toastNotifications,
        columns: ['test'],
      };
      const contextMock = {
        ...dataTableContextMock,
        selectedDocsState: props.selectedDocsState,
      };
      const component = mountWithIntl(
        <UnifiedDataTableContext.Provider value={contextMock}>
          <DataTableDocumentToolbarBtn {...props} />
        </UnifiedDataTableContext.Provider>
      );
      expect(findTestSubject(component, 'unifiedDataTableSelectionBtn').text()).toBe(
        `Selected${dataTableContextRowsMock.length}`
      );

      expect(findTestSubject(component, 'dscGridSelectAllDocs').exists()).toBe(false);
    });
  });

  describe('DataTableCompareToolbarBtn', () => {
    const props = {
      isPlainRecord: false,
      isFilterActive: false,
      rows: dataTableContextRowsMock,
      selectedDocsState: buildSelectedDocsState([]),
      setIsFilterActive: jest.fn(),
      enableComparisonMode: true,
      setIsCompareActive: jest.fn(),
      fieldFormats: servicesMock.fieldFormats,
      pageIndex: 0,
      pageSize: 2,
      toastNotifications: servicesMock.toastNotifications,
      columns: ['test'],
    };

    const renderCompareBtn = ({
      selectedDocIds = ['1', '2'],
      setIsCompareActive = jest.fn(),
    }: Partial<Parameters<typeof DataTableCompareToolbarBtn>[0]> = {}) => {
      render(
        <IntlProvider locale="en">
          <UnifiedDataTableContext.Provider
            value={{
              ...dataTableContextMock,
              selectedDocsState: props.selectedDocsState,
            }}
          >
            <DataTableDocumentToolbarBtn
              {...props}
              selectedDocsState={buildSelectedDocsState(selectedDocIds)}
              setIsCompareActive={setIsCompareActive}
            />
          </UnifiedDataTableContext.Provider>
        </IntlProvider>
      );
      return {
        getButton: async () => {
          const menuButton = await screen.findByTestId('unifiedDataTableSelectionBtn');
          menuButton.click();
          return screen.queryByRole('button', { name: /Compare/ });
        },
      };
    };

    it('should render the compare button', async () => {
      const { getButton } = renderCompareBtn();
      expect(await getButton()).toBeInTheDocument();
    });

    it('should call setIsCompareActive when the button is clicked', async () => {
      const setIsCompareActive = jest.fn();
      const { getButton } = renderCompareBtn({ setIsCompareActive });
      const button = await getButton();
      expect(button).toBeInTheDocument();
      expect(button?.getAttribute('disabled')).toBeNull();
      button?.click();
      expect(setIsCompareActive).toHaveBeenCalledWith(true);
    });

    it('should disable the button if limit is reached', async () => {
      const selectedDocIds = Array.from({ length: 500 }, (_, i) => i.toString());
      const setIsCompareActive = jest.fn();
      const { getButton } = renderCompareBtn({ selectedDocIds, setIsCompareActive });
      const button = await getButton();
      expect(button).toBeInTheDocument();
      expect(button?.getAttribute('disabled')).toBe('');
      button?.click();
      expect(setIsCompareActive).not.toHaveBeenCalled();
    });
  });
});
