/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ENABLE_ESQL } from '@kbn/esql-utils';
import { dataViewWithTimefieldMock } from '../../../../__mocks__/data_view_with_timefield';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import { getDiscoverInternalStateMock } from '../../../../__mocks__/discover_state.mock';
import { DiscoverToolkitTestProvider } from '../../../../__mocks__/test_provider';
import { createDataViewDataSource, createEsqlDataSource } from '../../../../../common/data_sources';
import { internalStateActions } from '../../state_management/redux';
import { DiscoverUninitialized } from './uninitialized';

const setup = async ({ isEsqlMode, draftQuery }: { isEsqlMode: boolean; draftQuery?: string }) => {
  const services = createDiscoverServicesMock();
  const getUiSettingsMock = jest.mocked(services.uiSettings.get);
  const originalGetImplementation = getUiSettingsMock.getMockImplementation();
  getUiSettingsMock.mockImplementation((key, defaultOverride) => {
    if (key === ENABLE_ESQL) {
      return true;
    }
    return originalGetImplementation?.(key, defaultOverride);
  });

  const toolkit = getDiscoverInternalStateMock({
    services,
    persistedDataViews: [dataViewWithTimefieldMock],
  });

  await toolkit.initializeTabs();
  toolkit.internalState.dispatch(
    internalStateActions.updateAppState({
      tabId: toolkit.getCurrentTab().id,
      appState: {
        dataSource: isEsqlMode
          ? createEsqlDataSource()
          : createDataViewDataSource({ dataViewId: dataViewWithTimefieldMock.id! }),
        query: isEsqlMode ? { esql: '' } : { query: '', language: 'kuery' },
      },
    })
  );
  await toolkit.initializeSingleTab({ tabId: toolkit.getCurrentTab().id });
  toolkit.internalState.dispatch(
    internalStateActions.setDataView({
      tabId: toolkit.getCurrentTab().id,
      dataView: dataViewWithTimefieldMock,
    })
  );

  if (draftQuery) {
    toolkit.internalState.dispatch(
      internalStateActions.setSearchDraftUiState({
        tabId: toolkit.getCurrentTab().id,
        searchDraftUiState: { query: { esql: draftQuery } },
      })
    );
  }

  render(
    <DiscoverToolkitTestProvider toolkit={toolkit}>
      <DiscoverUninitialized onRefresh={jest.fn()} />
    </DiscoverToolkitTestProvider>
  );

  return { toolkit };
};

describe('DiscoverUninitialized', () => {
  it('shows the start searching prompt in classic mode', async () => {
    await setup({ isEsqlMode: false });

    expect(screen.getByTestId('discoverUninitialized')).toBeVisible();
    expect(screen.getByTestId('refreshDataButton')).toBeVisible();
    expect(screen.getByTestId('queryInEsqlButton')).toBeVisible();
    expect(screen.queryByTestId('discoverRecommendedQueries')).not.toBeInTheDocument();
  });

  it('shows recommended queries built from the inherited source in ES|QL mode', async () => {
    await setup({ isEsqlMode: true });

    expect(screen.getByTestId('discoverRecommendedQueries')).toBeVisible();
    expect(screen.getByText('Recommended queries')).toBeVisible();
    expect(screen.getAllByTestId('discoverRecommendedQueryRun')).toHaveLength(6);
    expect(screen.getAllByText(/FROM/).length).toBeGreaterThan(0);
    expect(screen.queryByTestId('refreshDataButton')).not.toBeInTheDocument();
  });

  it('keeps the recommended queries while the user is typing a query', async () => {
    await setup({ isEsqlMode: true, draftQuery: 'FROM logs' });

    expect(screen.getByTestId('discoverRecommendedQueries')).toBeVisible();
  });

  it('runs a recommended query when its run button is clicked', async () => {
    const { toolkit } = await setup({ isEsqlMode: true });

    await userEvent.click(screen.getAllByTestId('discoverRecommendedQueryRun')[0]);

    expect(toolkit.getCurrentTab().appState.query).toEqual({
      esql: expect.stringContaining('FROM'),
    });
  });
});
