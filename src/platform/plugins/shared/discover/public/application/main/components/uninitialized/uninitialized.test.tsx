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
import { ENABLE_ESQL } from '@kbn/esql-utils';
import { dataViewWithTimefieldMock } from '../../../../__mocks__/data_view_with_timefield';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import { getDiscoverInternalStateMock } from '../../../../__mocks__/discover_state.mock';
import { DiscoverToolkitTestProvider } from '../../../../__mocks__/test_provider';
import { createDataViewDataSource, createEsqlDataSource } from '../../../../../common/data_sources';
import { internalStateActions } from '../../state_management/redux';
import { DiscoverUninitialized } from './uninitialized';

const setup = async ({ isEsqlMode }: { isEsqlMode: boolean }) => {
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

  render(
    <DiscoverToolkitTestProvider toolkit={toolkit}>
      <DiscoverUninitialized onRefresh={jest.fn()} />
    </DiscoverToolkitTestProvider>
  );
};

describe('DiscoverUninitialized', () => {
  it('shows the start searching prompt in classic mode', async () => {
    await setup({ isEsqlMode: false });

    expect(screen.getByTestId('discoverUninitialized')).toBeVisible();
    expect(screen.getByTestId('refreshDataButton')).toBeVisible();
    expect(screen.getByTestId('queryInEsqlButton')).toBeVisible();
    expect(screen.queryByTestId('discoverUninitializedKeyboardShortcuts')).not.toBeInTheDocument();
  });

  it('shows Discover-owned ES|QL keyboard shortcuts in ES|QL mode', async () => {
    await setup({ isEsqlMode: true });

    expect(screen.getByTestId('discoverUninitialized')).toBeVisible();
    expect(screen.getByTestId('discoverUninitializedKeyboardShortcuts')).toBeVisible();
    expect(screen.getByText('Editor keyboard shortcuts')).toBeVisible();
    expect(screen.getByText('Run query')).toBeVisible();
    expect(screen.getByText('Prettify query')).toBeVisible();
    expect(screen.queryByTestId('refreshDataButton')).not.toBeInTheDocument();
  });
});
