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
import { createFilterManagerMock } from '@kbn/data-plugin/public/query/filter_manager/filter_manager.mock';
import { dataViewWithTimefieldMock } from '../../../__mocks__/data_view_with_timefield';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { discoverServiceMock } from '../../../__mocks__/services';

import { DOC_HIDE_TIME_COLUMN_SETTING, MAX_DOC_FIELDS_DISPLAYED } from '@kbn/discover-utils';
import { buildDataTableRecord } from '@kbn/discover-utils';
import type { EsHitRecord } from '@kbn/discover-utils/types';

jest.mock('../utils/row_formatter', () => {
  const originalModule = jest.requireActual('../utils/row_formatter');
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
} as unknown as EsHitRecord;

const mockFilterManager = createFilterManagerMock();

describe('Doc table row component', () => {
  const mockInlineFilter = jest.fn();
  const defaultProps = {
    columns: ['_source'],
    filter: mockInlineFilter,
    dataView: dataViewWithTimefieldMock,
    row: buildDataTableRecord(mockHit, dataViewWithTimefieldMock),
    useNewFieldsApi: true,
    filterManager: mockFilterManager,
    addBasePath: (path: string) => path,
  } as unknown as TableRowProps;

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

  it('should apply filter when pressed', () => {
    const component = mountComponent({ ...defaultProps, columns: ['bytes'] });

    const fields = findTestSubject(component, 'docTableField');
    expect(fields.first().text()).toBe('20');

    const filterInButton = findTestSubject(component, 'docTableCellFilter');
    filterInButton.simulate('click');
    expect(mockInlineFilter).toHaveBeenCalledWith(
      dataViewWithTimefieldMock.getFieldByName('bytes'),
      20,
      '+'
    );
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

    it('should hide the single/surrounding views for text based languages', () => {
      const props = {
        ...defaultProps,
        isPlainRecord: true,
      };
      const component = mountComponent(props);
      const toggleButton = findTestSubject(component, 'docTableExpandToggleColumn');
      toggleButton.simulate('click');
      expect(findTestSubject(component, 'docTableRowDetailsTitle').text()).toBe('Expanded result');
      expect(findTestSubject(component, 'docTableRowAction').length).toBeFalsy();
    });
  });
});
