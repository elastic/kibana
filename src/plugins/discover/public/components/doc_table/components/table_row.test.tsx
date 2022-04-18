/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl, findTestSubject } from '@kbn/test-jest-helpers';
import { TableRow, TableRowProps } from './table_row';
import { setDocViewsRegistry } from '../../../kibana_services';
import { createFilterManagerMock } from '@kbn/data-plugin/public/query/filter_manager/filter_manager.mock';
import { indexPatternWithTimefieldMock } from '../../../__mocks__/index_pattern_with_timefield';
import { DocViewsRegistry } from '../../../services/doc_views/doc_views_registry';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { discoverServiceMock } from '../../../__mocks__/services';

import { DOC_HIDE_TIME_COLUMN_SETTING, MAX_DOC_FIELDS_DISPLAYED } from '../../../../common';

jest.mock('../lib/row_formatter', () => {
  const originalModule = jest.requireActual('../lib/row_formatter');
  return {
    ...originalModule,
    formatRow: () => {
      return <span data-test-subj="document-column-test">mocked_document_cell</span>;
    },
  };
});

const mountComponent = (props: TableRowProps) => {
  return mountWithIntl(
    <KibanaContextProvider
      services={{
        ...discoverServiceMock,
        uiSettings: {
          get: (key: string) => {
            if (key === DOC_HIDE_TIME_COLUMN_SETTING) {
              return true;
            } else if (key === MAX_DOC_FIELDS_DISPLAYED) {
              return 100;
            }
          },
        },
      }}
    >
      <table>
        <tbody>
          <TableRow {...props} />
        </tbody>
      </table>
    </KibanaContextProvider>
  );
};

const mockHit = {
  _index: 'mock_index',
  _id: '1',
  _score: 1,
  _type: '_doc',
  fields: [
    {
      timestamp: '2020-20-01T12:12:12.123',
    },
  ],
  _source: { message: 'mock_message', bytes: 20 },
};

const mockFilterManager = createFilterManagerMock();

describe('Doc table row component', () => {
  const mockInlineFilter = jest.fn();
  const defaultProps = {
    columns: ['_source'],
    filter: mockInlineFilter,
    indexPattern: indexPatternWithTimefieldMock,
    row: mockHit,
    useNewFieldsApi: true,
    filterManager: mockFilterManager,
    addBasePath: (path: string) => path,
  } as unknown as TableRowProps;

  beforeEach(() => {
    setDocViewsRegistry(new DocViewsRegistry());
  });

  it('should render __document__ column', () => {
    const component = mountComponent({ ...defaultProps, columns: [] });
    const docTableField = findTestSubject(component, 'docTableField');
    expect(docTableField.first().text()).toBe('mocked_document_cell');
  });

  it('should render message, _index and bytes fields', () => {
    const component = mountComponent({ ...defaultProps, columns: ['message', '_index', 'bytes'] });

    const fields = findTestSubject(component, 'docTableField');
    expect(fields.first().text()).toBe('mock_message');
    expect(fields.last().text()).toBe('20');
    expect(fields.length).toBe(3);
  });

  describe('details row', () => {
    it('should be empty by default', () => {
      const component = mountComponent(defaultProps);
      expect(findTestSubject(component, 'docTableRowDetailsTitle').exists()).toBeFalsy();
    });

    it('should expand the detail row when the toggle arrow is clicked', () => {
      const component = mountComponent(defaultProps);
      const toggleButton = findTestSubject(component, 'docTableExpandToggleColumn');

      expect(findTestSubject(component, 'docTableRowDetailsTitle').exists()).toBeFalsy();
      toggleButton.simulate('click');
      expect(findTestSubject(component, 'docTableRowDetailsTitle').exists()).toBeTruthy();
    });
  });
});
