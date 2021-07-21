/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { findTestSubject, mountWithIntl } from '@kbn/test/jest';
import { UI_SETTINGS } from '../../../../../data/public';
import { createFilterManagerMock } from '../../../../../data/public/query/filter_manager/filter_manager.mock';
import { DOC_HIDE_TIME_COLUMN_SETTING, SORT_DEFAULT_ORDER_SETTING } from '../../../../common';
import { DiscoverServices } from '../../../build_services';
import { setServices } from '../../../kibana_services';
import { indexPatternMock } from '../../../__mocks__/index_pattern';
import { DocTable, DocTableProps } from './doc_table';
import { DocTableRow } from './components/table_row';

const mountComponent = (props: DocTableProps) => {
  return mountWithIntl(<DocTable {...props} />);
};

const mockFilterManager = createFilterManagerMock();

describe('Doc table component', () => {
  let defaultProps: DocTableProps;

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
      type: 'context',
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
    };

    setServices(({
      uiSettings: {
        get: (key: string) => {
          if (key === DOC_HIDE_TIME_COLUMN_SETTING) {
            return true;
          } else if (key === SORT_DEFAULT_ORDER_SETTING) {
            return 'desc';
          } else if (UI_SETTINGS.SHORT_DOTS_ENABLE) {
            return false;
          }
        },
      },
      filterManager: mockFilterManager,
      addBasePath: (path: string) => path,
    } as unknown) as DiscoverServices);
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
