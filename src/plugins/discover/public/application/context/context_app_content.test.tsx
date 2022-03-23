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
import { ActionBar } from './components/action_bar/action_bar';
import { GetStateReturn } from './services/context_state';
import { SortDirection } from 'src/plugins/data/public';
import { ContextAppContent, ContextAppContentProps } from './context_app_content';
import { LoadingStatus } from './services/context_query_state';
import { indexPatternMock } from '../../__mocks__/index_pattern';
import { DiscoverGrid } from '../../components/discover_grid/discover_grid';
import { discoverServiceMock } from '../../__mocks__/services';
import { DocTableWrapper } from '../../components/doc_table/doc_table_wrapper';
import { EsHitRecordList } from '../types';
import { KibanaContextProvider } from '../../../../kibana_react/public';

describe('ContextAppContent test', () => {
  const mountComponent = ({
    anchorStatus,
    isLegacy,
  }: {
    anchorStatus?: LoadingStatus;
    isLegacy?: boolean;
  }) => {
    const hit = {
      _id: '123',
      _index: 'test_index',
      _score: null,
      _version: 1,
      fields: [
        {
          order_date: ['2020-10-19T13:35:02.000Z'],
        },
      ],
      _source: {
        category: ["Men's Clothing"],
        currency: 'EUR',
        customer_first_name: 'Walker',
        customer_full_name: 'Walker Texas Ranger',
        customer_gender: 'MALE',
        customer_last_name: 'Ranger',
      },
      sort: [1603114502000, 2092],
    };
    const props = {
      columns: ['order_date', '_source'],
      indexPattern: indexPatternMock,
      stateContainer: {} as unknown as GetStateReturn,
      anchorStatus: anchorStatus || LoadingStatus.LOADED,
      predecessorsStatus: LoadingStatus.LOADED,
      successorsStatus: LoadingStatus.LOADED,
      rows: [hit] as unknown as EsHitRecordList,
      predecessors: [],
      successors: [],
      defaultStepSize: 5,
      predecessorCount: 10,
      successorCount: 10,
      useNewFieldsApi: true,
      isPaginationEnabled: false,
      onAddColumn: () => {},
      onRemoveColumn: () => {},
      onSetColumns: () => {},
      sort: [['order_date', 'desc']] as Array<[string, SortDirection]>,
      isLegacy: isLegacy ?? true,
      setAppState: () => {},
      addFilter: () => {},
    } as unknown as ContextAppContentProps;

    return mountWithIntl(
      <KibanaContextProvider services={discoverServiceMock}>
        <ContextAppContent {...props} />
      </KibanaContextProvider>
    );
  };

  it('should render legacy table correctly', () => {
    const component = mountComponent({});
    expect(component.find(DocTableWrapper).length).toBe(1);
    const loadingIndicator = findTestSubject(component, 'contextApp_loadingIndicator');
    expect(loadingIndicator.length).toBe(0);
    expect(component.find(ActionBar).length).toBe(2);
  });

  it('renders loading indicator', () => {
    const component = mountComponent({ anchorStatus: LoadingStatus.LOADING });
    const loadingIndicator = findTestSubject(component, 'contextApp_loadingIndicator');
    expect(component.find(DocTableWrapper).length).toBe(1);
    expect(loadingIndicator.length).toBe(1);
  });

  it('should render discover grid correctly', () => {
    const component = mountComponent({ isLegacy: false });
    expect(component.find(DiscoverGrid).length).toBe(1);
  });
});
