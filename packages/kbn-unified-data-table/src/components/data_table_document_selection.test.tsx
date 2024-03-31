/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { findTestSubject } from '@elastic/eui/lib/test';
import { DataTableDocumentToolbarBtn, SelectButton } from './data_table_document_selection';
import { dataTableContextMock } from '../../__mocks__/table_context';
import { UnifiedDataTableContext } from '../table_context';
import { getDocId } from '@kbn/discover-utils';

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

    test('is checked', () => {
      const contextMock = {
        ...dataTableContextMock,
        selectedDocs: ['i::1::'],
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
      expect(checkBox.props().checked).toBeTruthy();
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
      expect(contextMock.setSelectedDocs).toHaveBeenCalledWith(['i::1::']);
    });
    test('removing a selection', () => {
      const contextMock = {
        ...dataTableContextMock,
        selectedDocs: ['i::1::'],
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
      expect(contextMock.setSelectedDocs).toHaveBeenCalledWith([]);
    });
  });
  describe('DataTableDocumentToolbarBtn', () => {
    test('it renders a button clickable button', () => {
      const props = {
        isPlainRecord: false,
        isFilterActive: false,
        rows: dataTableContextMock.rows,
        selectedDocs: ['i::1::'],
        setIsFilterActive: jest.fn(),
        setSelectedDocs: jest.fn(),
        setIsCompareActive: jest.fn(),
      };
      const component = mountWithIntl(<DataTableDocumentToolbarBtn {...props} />);
      const button = findTestSubject(component, 'unifiedDataTableSelectionBtn');
      expect(button.length).toBe(1);
    });
  });
});
