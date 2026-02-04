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
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { SelectedVSAvailableCallout } from './selected_vs_available_callout';
import { getDiscoverInternalStateMock } from '../../../../__mocks__/discover_state.mock';
import { DiscoverToolkitTestProvider } from '../../../../__mocks__/test_provider';
import { internalStateActions } from '../../state_management/redux';

describe('SelectedVSAvailableCallout', () => {
  it('should render the callout if in ES|QL mode and the selected columns are less than the available ones', async () => {
    const toolkit = getDiscoverInternalStateMock();
    await toolkit.initializeTabs();
    toolkit.internalState.dispatch(
      internalStateActions.updateAppState({
        tabId: toolkit.getCurrentTab().id,
        appState: { query: { esql: 'select *' } },
      })
    );
    await toolkit.initializeSingleTab({ tabId: toolkit.getCurrentTab().id });
    const component = mountWithIntl(
      <DiscoverToolkitTestProvider toolkit={toolkit}>
        <SelectedVSAvailableCallout
          esqlQueryColumns={
            [
              { id: '1', name: 'extension', meta: { type: 'text' } },
              { id: '2', name: 'bytes', meta: { type: 'number' } },
              { id: '3', name: '@timestamp', meta: { type: 'date' } },
            ] as DatatableColumn[]
          }
          selectedColumns={['bytes']}
        />
      </DiscoverToolkitTestProvider>
    );
    expect(component.find('[data-test-subj="dscSelectedColumnsCallout"]').exists()).toBe(true);
  });

  it('should not render the callout if not in ES|QL mode', async () => {
    const toolkit = getDiscoverInternalStateMock();
    await toolkit.initializeTabs();
    await toolkit.initializeSingleTab({ tabId: toolkit.getCurrentTab().id });
    const component = mountWithIntl(
      <DiscoverToolkitTestProvider toolkit={toolkit}>
        <SelectedVSAvailableCallout esqlQueryColumns={undefined} selectedColumns={['bytes']} />
      </DiscoverToolkitTestProvider>
    );
    expect(component.find('[data-test-subj="dscSelectedColumnsCallout"]').exists()).toBe(false);
  });

  it('should not render the callout if in ES|QL mode but the selected columns are equal with the available ones', async () => {
    const toolkit = getDiscoverInternalStateMock();
    await toolkit.initializeTabs();
    await toolkit.initializeSingleTab({ tabId: toolkit.getCurrentTab().id });
    const component = mountWithIntl(
      <DiscoverToolkitTestProvider toolkit={toolkit}>
        <SelectedVSAvailableCallout
          esqlQueryColumns={
            [{ id: '2', name: 'bytes', meta: { type: 'number' } }] as DatatableColumn[]
          }
          selectedColumns={['bytes']}
        />
      </DiscoverToolkitTestProvider>
    );
    expect(component.find('[data-test-subj="dscSelectedColumnsCallout"]').exists()).toBe(false);
  });
});
