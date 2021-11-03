/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test/jest';
import { findTestSubject } from '@elastic/eui/lib/test';
import { ActionBar } from './components/action_bar/action_bar';
import { AppState, GetStateReturn } from './services/context_state';
import { SortDirection } from 'src/plugins/data/common';
import { ContextAppContent, ContextAppContentProps } from './context_app_content';
import { getServices, setServices } from '../../kibana_services';
import { LoadingStatus } from './services/context_query_state';
import { indexPatternMock } from '../../__mocks__/index_pattern';
import { DiscoverGrid } from '../../components/discover_grid/discover_grid';
import { discoverServiceMock } from '../../__mocks__/services';
import { DocTableWrapper } from '../../components/doc_table/doc_table_wrapper';
import { EsHitRecordList } from '../types';

describe('ContextAppContent test', () => {
  let hit;
  let defaultProps: ContextAppContentProps;

  beforeEach(() => {
    setServices(discoverServiceMock);

    hit = {
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
    defaultProps = {
      columns: ['order_date', '_source'],
      indexPattern: indexPatternMock,
      appState: {} as unknown as AppState,
      stateContainer: {} as unknown as GetStateReturn,
      anchorStatus: LoadingStatus.LOADED,
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
      services: getServices(),
      sort: [['order_date', 'desc']] as Array<[string, SortDirection]>,
      isLegacy: true,
      setAppState: () => {},
      addFilter: () => {},
    } as unknown as ContextAppContentProps;
  });

  it('should render legacy table correctly', () => {
    const component = mountWithIntl(<ContextAppContent {...defaultProps} />);
    expect(component.find(DocTableWrapper).length).toBe(1);
    const loadingIndicator = findTestSubject(component, 'contextApp_loadingIndicator');
    expect(loadingIndicator.length).toBe(0);
    expect(component.find(ActionBar).length).toBe(2);
  });

  it('renders loading indicator', () => {
    const props = { ...defaultProps };
    props.anchorStatus = LoadingStatus.LOADING;
    const component = mountWithIntl(<ContextAppContent {...props} />);
    const loadingIndicator = findTestSubject(component, 'contextApp_loadingIndicator');
    expect(component.find(DocTableWrapper).length).toBe(1);
    expect(loadingIndicator.length).toBe(1);
  });

  it('should render discover grid correctly', () => {
    const props = { ...defaultProps, isLegacy: false };
    const component = mountWithIntl(<ContextAppContent {...props} />);
    expect(component.find(DiscoverGrid).length).toBe(1);
  });
});
