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
import { GetStateReturn } from './services/context_state';
import { SortDirection } from '@kbn/data-plugin/public';
import { UnifiedDataTable } from '@kbn/unified-data-table';
import { ContextAppContent, ContextAppContentProps } from './context_app_content';
import { LoadingStatus } from './services/context_query_state';
import { discoverServiceMock } from '../../__mocks__/services';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { act } from 'react-dom/test-utils';
import { buildDataViewMock, deepMockedFields } from '@kbn/discover-utils/src/__mocks__';

const dataViewMock = buildDataViewMock({
  name: 'the-data-view',
  fields: deepMockedFields,
});

describe('ContextAppContent test', () => {
  const mountComponent = async ({ anchorStatus }: { anchorStatus?: LoadingStatus }) => {
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
      isPaginationEnabled: false,
      onAddColumn: () => {},
      onRemoveColumn: () => {},
      onSetColumns: () => {},
      sort: [['order_date', 'desc']] as Array<[string, SortDirection]>,
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

  it('should render discover grid correctly', async () => {
    const component = await mountComponent({});
    expect(component.find(UnifiedDataTable).length).toBe(1);
    expect(findTestSubject(component, 'unifiedDataTableToolbar').exists()).toBe(true);
  });

  it('should not show display options button', async () => {
    const component = await mountComponent({});
    expect(findTestSubject(component, 'unifiedDataTableToolbar').exists()).toBe(true);
    expect(findTestSubject(component, 'dataGridDisplaySelectorButton').exists()).toBe(false);
  });
});
