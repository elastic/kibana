/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiIcon, EuiLoadingSpinner } from '@elastic/eui';
import { findTestSubject, mountWithIntl } from '@kbn/test-jest-helpers';
import { dataViewMock } from '../../__mocks__/data_view';
import { DocTableWrapper, DocTableWrapperProps } from './doc_table_wrapper';
import { discoverServiceMock } from '../../__mocks__/services';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { buildDataTableRecord } from '../../utils/build_data_record';
import { EsHitRecord } from '../../types';

describe('Doc table component', () => {
  const mountComponent = (customProps?: Partial<DocTableWrapperProps>) => {
    const props = {
      columns: ['_source'],
      dataView: dataViewMock,
      rows: [
        {
          _index: 'mock_index',
          _id: '1',
          _score: 1,
          fields: [
            {
              timestamp: '2020-20-01T12:12:12.123',
            },
          ],
          _source: { message: 'mock_message', bytes: 20 },
        } as EsHitRecord,
      ].map((row) => buildDataTableRecord(row, dataViewMock)),
      sort: [['order_date', 'desc']],
      isLoading: false,
      searchDescription: '',
      onAddColumn: () => {},
      onFilter: () => {},
      onMoveColumn: () => {},
      onRemoveColumn: () => {},
      onSort: () => {},
      useNewFieldsApi: true,
      dataTestSubj: 'discoverDocTable',
      render: () => {
        return <div data-test-subj="docTable">mock</div>;
      },
      ...(customProps || {}),
    };

    return mountWithIntl(
      <KibanaContextProvider services={discoverServiceMock}>
        <DocTableWrapper {...props} />
      </KibanaContextProvider>
    );
  };

  it('should render infinite table correctly', () => {
    const component = mountComponent();
    expect(findTestSubject(component, 'discoverDocTable').exists()).toBeTruthy();
    expect(findTestSubject(component, 'docTable').exists()).toBeTruthy();
    expect(component.find('.kbnDocTable__error').exists()).toBeFalsy();
  });

  it('should render error fallback if rows array is empty', () => {
    const component = mountComponent({ rows: [], isLoading: false });
    expect(findTestSubject(component, 'discoverDocTable').exists()).toBeTruthy();
    expect(findTestSubject(component, 'docTable').exists()).toBeFalsy();
    expect(component.find('.kbnDocTable__error').find(EuiIcon).exists()).toBeTruthy();
  });

  it('should render loading indicator', () => {
    const component = mountComponent({ rows: [], isLoading: true });
    expect(findTestSubject(component, 'discoverDocTable').exists()).toBeTruthy();
    expect(findTestSubject(component, 'docTable').exists()).toBeFalsy();
    expect(component.find('.kbnDocTable__error').find(EuiLoadingSpinner).exists()).toBeTruthy();
  });
});
