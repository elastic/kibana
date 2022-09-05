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
import { DiscoverGridDocumentToolbarBtn, SelectButton } from './discover_grid_document_selection';
import { discoverGridContextMock } from '../../__mocks__/grid_context';
import { DiscoverGridContext } from './discover_grid_context';
import { getDocId } from '../../utils/get_doc_id';

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
        ...discoverGridContextMock,
      };

      const component = mountWithIntl(
        <DiscoverGridContext.Provider value={contextMock}>
          <SelectButton
            rowIndex={0}
            colIndex={0}
            setCellProps={jest.fn()}
            columnId="test"
            isExpanded={false}
            isDetails={false}
            isExpandable={false}
          />
        </DiscoverGridContext.Provider>
      );

      const checkBox = findTestSubject(component, 'dscGridSelectDoc-i::1::');
      expect(checkBox.props().checked).toBeFalsy();
    });

    test('is checked', () => {
      const contextMock = {
        ...discoverGridContextMock,
        selectedDocs: ['i::1::'],
      };

      const component = mountWithIntl(
        <DiscoverGridContext.Provider value={contextMock}>
          <SelectButton
            rowIndex={0}
            colIndex={0}
            setCellProps={jest.fn()}
            columnId="test"
            isExpanded={false}
            isDetails={false}
            isExpandable={false}
          />
        </DiscoverGridContext.Provider>
      );

      const checkBox = findTestSubject(component, 'dscGridSelectDoc-i::1::');
      expect(checkBox.props().checked).toBeTruthy();
    });

    test('adding a selection', () => {
      const contextMock = {
        ...discoverGridContextMock,
      };

      const component = mountWithIntl(
        <DiscoverGridContext.Provider value={contextMock}>
          <SelectButton
            rowIndex={0}
            colIndex={0}
            setCellProps={jest.fn()}
            columnId="test"
            isExpanded={false}
            isDetails={false}
            isExpandable={false}
          />
        </DiscoverGridContext.Provider>
      );

      const checkBox = findTestSubject(component, 'dscGridSelectDoc-i::1::');
      checkBox.simulate('change');
      expect(contextMock.setSelectedDocs).toHaveBeenCalledWith(['i::1::']);
    });
    test('removing a selection', () => {
      const contextMock = {
        ...discoverGridContextMock,
        selectedDocs: ['i::1::'],
      };

      const component = mountWithIntl(
        <DiscoverGridContext.Provider value={contextMock}>
          <SelectButton
            rowIndex={0}
            colIndex={0}
            setCellProps={jest.fn()}
            columnId="test"
            isExpanded={false}
            isDetails={false}
            isExpandable={false}
          />
        </DiscoverGridContext.Provider>
      );

      const checkBox = findTestSubject(component, 'dscGridSelectDoc-i::1::');
      checkBox.simulate('change');
      expect(contextMock.setSelectedDocs).toHaveBeenCalledWith([]);
    });
  });
  describe('DiscoverGridDocumentToolbarBtn', () => {
    test('it renders a button clickable button', () => {
      const props = {
        isFilterActive: false,
        rows: discoverGridContextMock.rows,
        selectedDocs: ['i::1::'],
        setIsFilterActive: jest.fn(),
        setSelectedDocs: jest.fn(),
      };
      const component = mountWithIntl(<DiscoverGridDocumentToolbarBtn {...props} />);
      const button = findTestSubject(component, 'dscGridSelectionBtn');
      expect(button.length).toBe(1);
    });
  });
});
