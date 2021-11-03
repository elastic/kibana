/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { findTestSubject, mountWithIntl } from '@kbn/test/jest';
import { setServices } from '../../../../../kibana_services';
import { indexPatternMock } from '../../../../../__mocks__/index_pattern';
import { DocTableWrapper, DocTableWrapperProps } from './doc_table_wrapper';
import { DocTableRow } from './components/table_row';
import { discoverServiceMock } from '../../../../../__mocks__/services';

const mountComponent = (props: DocTableWrapperProps) => {
  return mountWithIntl(<DocTableWrapper {...props} />);
};

describe('Doc table component', () => {
  let defaultProps: DocTableWrapperProps;

  const initDefaults = (rows?: DocTableRow[]) => {
    defaultProps = {
      columns: ['_source'],
      indexPattern: indexPatternMock,
      rows: rows || [
        {
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
        },
      ],
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
    };

    setServices(discoverServiceMock);
  };

  it('should render infinite table correctly', () => {
    initDefaults();
    const component = mountComponent(defaultProps);
    expect(findTestSubject(component, defaultProps.dataTestSubj).exists()).toBeTruthy();
    expect(findTestSubject(component, 'docTable').exists()).toBeTruthy();
    expect(component.find('.kbnDocTable__error').exists()).toBeFalsy();
  });

  it('should render error fallback if rows array is empty', () => {
    initDefaults([]);
    const component = mountComponent(defaultProps);
    expect(findTestSubject(component, defaultProps.dataTestSubj).exists()).toBeTruthy();
    expect(findTestSubject(component, 'docTable').exists()).toBeFalsy();
    expect(component.find('.kbnDocTable__error').exists()).toBeTruthy();
  });
});
