/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { findTestSubject } from '@elastic/eui/lib/test';
import { ActionBar } from './components/action_bar/action_bar';
import { GetStateReturn } from './services/context_state';
import { SortDirection } from '@kbn/data-plugin/public';
import { UnifiedDataTable } from '@kbn/unified-data-table';
import { ContextAppContent, ContextAppContentProps } from './context_app_content';
import { LoadingStatus } from './services/context_query_state';
import { discoverServiceMock } from '../../__mocks__/services';
import { DocTableWrapper } from '../../components/doc_table/doc_table_wrapper';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { act } from 'react-dom/test-utils';
import { buildDataViewMock, deepMockedFields } from '@kbn/discover-utils/src/__mocks__';

const dataViewMock = buildDataViewMock({
  name: 'the-data-view',
  fields: deepMockedFields,
});

describe('ContextAppContent test', () => {
  const mountComponent = async ({
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
      dataView: dataViewMock,
      stateContainer: {} as unknown as GetStateReturn,
      anchorStatus: anchorStatus || LoadingStatus.LOADED,
      predecessorsStatus: LoadingStatus.LOADED,
      successorsStatus: LoadingStatus.LOADED,
      rows: [buildDataTableRecord(hit, dataViewMock)],
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
      interceptedWarnings: [],
    } as unknown as ContextAppContentProps;

    const component = mountWithIntl(
      <KibanaContextProvider services={discoverServiceMock}>
        <ContextAppContent {...props} />
      </KibanaContextProvider>
    );
    await act(async () => {
      // needed by cell actions to complete async loading
      component.update();
    });
    return component;
  };

  it('should render legacy table correctly', async () => {
    const component = await mountComponent({});
    expect(component.find(DocTableWrapper).length).toBe(1);
    const loadingIndicator = findTestSubject(component, 'contextApp_loadingIndicator');
    expect(loadingIndicator.length).toBe(0);
    expect(component.find(ActionBar).length).toBe(2);
  });

  it('renders loading indicator', async () => {
    const component = await mountComponent({ anchorStatus: LoadingStatus.LOADING });
    const loadingIndicator = findTestSubject(component, 'contextApp_loadingIndicator');
    expect(component.find(DocTableWrapper).length).toBe(1);
    expect(loadingIndicator.length).toBe(1);
  });

  it('should render discover grid correctly', async () => {
    const component = await mountComponent({ isLegacy: false });
    expect(component.find(UnifiedDataTable).length).toBe(1);
    expect(findTestSubject(component, 'unifiedDataTableToolbar').exists()).toBe(true);
  });

  it('should not show display options button', async () => {
    const component = await mountComponent({ isLegacy: false });
    expect(findTestSubject(component, 'unifiedDataTableToolbar').exists()).toBe(true);
    expect(findTestSubject(component, 'dataGridDisplaySelectorButton').exists()).toBe(false);
  });
});
