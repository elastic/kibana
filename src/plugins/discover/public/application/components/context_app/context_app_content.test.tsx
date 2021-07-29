/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test/jest';
import { uiSettingsMock as mockUiSettings } from '../../../__mocks__/ui_settings';
import { DocTableLegacy } from '../../angular/doc_table/create_doc_table_react';
import { findTestSubject } from '@elastic/eui/lib/test';
import { ActionBar } from '../../angular/context/components/action_bar/action_bar';
import { AppState, GetStateReturn } from '../../angular/context_state';
import { SortDirection } from 'src/plugins/data/common';
import { EsHitRecordList } from '../../angular/context/api/context';
import { ContextAppContent, ContextAppContentProps } from './context_app_content';
import { getServices } from '../../../kibana_services';
import { LoadingStatus } from '../../angular/context_query_state';
import { indexPatternMock } from '../../../__mocks__/index_pattern';
import { DiscoverGrid } from '../discover_grid/discover_grid';

jest.mock('../../../kibana_services', () => {
  return {
    getServices: () => ({
      uiSettings: mockUiSettings,
    }),
  };
});

describe('ContextAppContent test', () => {
  const hit = {
    _id: '123',
    _index: 'test_index',
    _score: null,
    _version: 1,
    _source: {
      category: ["Men's Clothing"],
      currency: 'EUR',
      customer_first_name: 'Walker',
      customer_full_name: 'Walker Texas Ranger',
      customer_gender: 'MALE',
      customer_last_name: 'Ranger',
    },
    fields: [{ order_date: ['2020-10-19T13:35:02.000Z'] }],
    sort: [1603114502000, 2092],
  };
  const defaultProps = ({
    columns: ['Time (@timestamp)', '_source'],
    indexPattern: indexPatternMock,
    appState: ({} as unknown) as AppState,
    stateContainer: ({} as unknown) as GetStateReturn,
    anchorStatus: LoadingStatus.LOADED,
    predecessorsStatus: LoadingStatus.LOADED,
    successorsStatus: LoadingStatus.LOADED,
    rows: ([hit] as unknown) as EsHitRecordList,
    predecessors: [],
    successors: [],
    defaultStepSize: 5,
    predecessorCount: 10,
    successorCount: 10,
    useNewFieldsApi: false,
    isPaginationEnabled: false,
    onAddColumn: () => {},
    onRemoveColumn: () => {},
    onSetColumns: () => {},
    services: getServices(),
    sort: [['order_date', 'desc']] as Array<[string, SortDirection]>,
    isLegacy: true,
    setAppState: () => {},
    addFilter: () => {},
  } as unknown) as ContextAppContentProps;

  it('should render legacy table correctly', () => {
    const component = mountWithIntl(<ContextAppContent {...defaultProps} />);
    expect(component.find(DocTableLegacy).length).toBe(1);
    const loadingIndicator = findTestSubject(component, 'contextApp_loadingIndicator');
    expect(loadingIndicator.length).toBe(0);
    expect(component.find(ActionBar).length).toBe(2);
  });

  it('renders loading indicator', () => {
    const props = { ...defaultProps };
    props.anchorStatus = LoadingStatus.LOADING;
    const component = mountWithIntl(<ContextAppContent {...props} />);
    expect(component.find(DocTableLegacy).length).toBe(0);
    const loadingIndicator = findTestSubject(component, 'contextApp_loadingIndicator');
    expect(loadingIndicator.length).toBe(1);
  });

  it('renders error message', () => {
    const props = { ...defaultProps };
    props.anchorStatus = LoadingStatus.FAILED;
    const component = mountWithIntl(<ContextAppContent {...props} />);
    expect(component.find(DocTableLegacy).length).toBe(0);
  });

  it('should render discover grid correctly', () => {
    const props = { ...defaultProps, isLegacy: false };
    const component = mountWithIntl(<ContextAppContent {...props} />);
    expect(component.find(DiscoverGrid).length).toBe(1);
  });
});
