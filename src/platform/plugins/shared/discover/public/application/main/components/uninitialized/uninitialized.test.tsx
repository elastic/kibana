/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ENABLE_ESQL, getEditorExtensions } from '@kbn/esql-utils';
import { dataViewWithTimefieldMock } from '../../../../__mocks__/data_view_with_timefield';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import { getDiscoverInternalStateMock } from '../../../../__mocks__/discover_state.mock';
import { DiscoverToolkitTestProvider } from '../../../../__mocks__/test_provider';
import { createDataViewDataSource, createEsqlDataSource } from '../../../../../common/data_sources';
import { internalStateActions } from '../../state_management/redux';
import { DiscoverUninitialized } from './uninitialized';

jest.mock('@kbn/esql-utils', () => ({
  ...jest.requireActual('@kbn/esql-utils'),
  getEditorExtensions: jest.fn(),
}));

const getEditorExtensionsMock = jest.mocked(getEditorExtensions);

const searchAllMetrics = {
  name: 'Search all metrics',
  query: 'TS metrics-*',
  description: 'Searches all available metrics',
  isStandalone: true,
};

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

  await act(async () => {
    render(
      <DiscoverToolkitTestProvider toolkit={toolkit}>
        <DiscoverUninitialized onRefresh={jest.fn()} />
      </DiscoverToolkitTestProvider>
    );
  });

  return { toolkit };
};

describe('DiscoverUninitialized', () => {
  beforeEach(() => {
    getEditorExtensionsMock.mockReset();
    getEditorExtensionsMock.mockResolvedValue({ recommendedQueries: [], recommendedFields: [] });
  });

  it('shows the start searching prompt in classic mode', async () => {
    await setup({ isEsqlMode: false });

    expect(screen.getByTestId('discoverUninitialized')).toBeVisible();
    expect(screen.getByTestId('refreshDataButton')).toBeVisible();
    expect(screen.getByTestId('queryInEsqlButton')).toBeVisible();
    expect(screen.queryByTestId('discoverRecommendedQueries')).not.toBeInTheDocument();
    expect(getEditorExtensionsMock).not.toHaveBeenCalled();
  });

  it('shows recommended queries built from the inherited source in ES|QL mode', async () => {
    await setup({ isEsqlMode: true });

    expect(await screen.findByTestId('discoverRecommendedQueries')).toBeVisible();
    expect(screen.getByText('Recommended queries')).toBeVisible();
    expect(screen.getAllByTestId('discoverRecommendedQueryRun')).toHaveLength(6);
    expect(screen.getAllByText(/FROM/).length).toBeGreaterThan(0);
    expect(screen.queryByTestId('refreshDataButton')).not.toBeInTheDocument();
  });

  it('requests the extensions for the inherited source and the active solution', async () => {
    await setup({ isEsqlMode: true });
    await screen.findByTestId('discoverRecommendedQueries');

    expect(getEditorExtensionsMock).toHaveBeenCalledTimes(1);
    expect(getEditorExtensionsMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringMatching(/^FROM .+ $/),
      'classic',
      expect.any(AbortSignal)
    );
  });

  it('requests the extensions for the TS command when the inherited data view is a TSDB one', async () => {
    const isTSDBModeSpy = jest.spyOn(dataViewWithTimefieldMock, 'isTSDBMode').mockReturnValue(true);
    try {
      await setup({ isEsqlMode: true });
      await screen.findByTestId('discoverRecommendedQueries');

      expect(getEditorExtensionsMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringMatching(/^TS .+ $/),
        'classic',
        expect.any(AbortSignal)
      );
    } finally {
      isTSDBModeSpy.mockRestore();
    }
  });

  it('shows the extension queries before the generic ones', async () => {
    getEditorExtensionsMock.mockResolvedValue({
      recommendedQueries: [searchAllMetrics],
      recommendedFields: [],
    });
    await setup({ isEsqlMode: true });
    await screen.findByTestId('discoverRecommendedQueries');

    const runButtons = screen.getAllByTestId('discoverRecommendedQueryRun');
    expect(runButtons).toHaveLength(6);
    expect(runButtons[0]).toHaveAccessibleName('Run query: Search all metrics');
  });

  it('falls back to the generic queries when the extensions request fails', async () => {
    getEditorExtensionsMock.mockRejectedValue(new Error('failed'));
    await setup({ isEsqlMode: true });

    expect(await screen.findByTestId('discoverRecommendedQueries')).toBeVisible();
    expect(screen.getAllByTestId('discoverRecommendedQueryRun')).toHaveLength(6);
    expect(screen.queryByText('Search all metrics')).not.toBeInTheDocument();
  });

  it('keeps the recommended queries while the user is typing a query', async () => {
    await setup({ isEsqlMode: true, draftQuery: 'FROM logs' });

    expect(await screen.findByTestId('discoverRecommendedQueries')).toBeVisible();
  });

  it('runs a recommended query when its run button is clicked', async () => {
    const { toolkit } = await setup({ isEsqlMode: true });
    const [firstRunButton] = await screen.findAllByTestId('discoverRecommendedQueryRun');

    await userEvent.click(firstRunButton);

    expect(toolkit.getCurrentTab().appState.query).toEqual({
      esql: expect.stringContaining('FROM'),
    });
  });

  it('runs an extension query as is', async () => {
    getEditorExtensionsMock.mockResolvedValue({
      recommendedQueries: [searchAllMetrics],
      recommendedFields: [],
    });
    const { toolkit } = await setup({ isEsqlMode: true });
    const [firstRunButton] = await screen.findAllByTestId('discoverRecommendedQueryRun');

    await userEvent.click(firstRunButton);

    expect(toolkit.getCurrentTab().appState.query).toEqual({ esql: 'TS metrics-*' });
  });
});
