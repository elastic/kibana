/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { Subject } from 'rxjs';
import { act, render, waitFor } from '@testing-library/react';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import { getDiscoverInternalStateMock } from '../../../../__mocks__/discover_state.mock';
import { DiscoverToolkitTestProvider } from '../../../../__mocks__/test_provider';
import { FetchStatus } from '../../../types';
import { internalStateActions } from '../../state_management/redux';
import type { DiscoverLatestFetchDetails } from '../../state_management/discover_data_state_container';

const mockRenderChartSection = jest.fn((_props: ChartSectionProps) => <div />);

jest.mock('../../../../context_awareness', () => {
  const originalModule = jest.requireActual('../../../../context_awareness');
  return {
    ...originalModule,
    useProfileAccessor: (key: string) =>
      key === 'getChartSectionConfiguration'
        ? () => () => ({
            replaceDefaultChart: true,
            renderChartSection: mockRenderChartSection,
          })
        : originalModule.useProfileAccessor(key),
  };
});

describe('ChartPortalsRenderer', () => {
  const setup = async () => {
    const toolkit = getDiscoverInternalStateMock();

    await toolkit.initializeTabs();
    await toolkit.initializeSingleTab({ tabId: toolkit.getCurrentTab().id });

    toolkit.internalState.dispatch(
      toolkit.injectCurrentTab(internalStateActions.updateAppState)({
        appState: { query: { esql: 'from *' }, hideChart: false },
      })
    );

    toolkit.internalState.dispatch(
      toolkit.injectCurrentTab(internalStateActions.setDataRequestParams)({
        dataRequestParams: {
          timeRangeAbsolute: { from: '2021-05-01T20:00:00Z', to: '2021-05-02T20:00:00Z' },
          timeRangeRelative: { from: 'now-15m', to: 'now' },
          searchSessionId: 'searchSessionId',
          isSearchSessionRestored: false,
        },
      })
    );

    const dataStateContainer = toolkit.getCurrentTabDataStateContainer();
    const fetchChart$ = new Subject<DiscoverLatestFetchDetails>();
    dataStateContainer.fetchChart$ = fetchChart$;

    render(<DiscoverToolkitTestProvider toolkit={toolkit} usePortalsRenderer />);

    await act(() => setTimeout(0));
    act(() => {
      fetchChart$.next({ abortController: new AbortController() });
    });

    await waitFor(() => expect(mockRenderChartSection).toHaveBeenCalled());

    const [{ onChartLoaded }] = mockRenderChartSection.mock.lastCall ?? [];
    const { main$ } = dataStateContainer.data$;

    return { onChartLoaded, main$ };
  };

  beforeEach(() => {
    mockRenderChartSection.mockClear();
  });

  it('should set main$ to partial when a custom chart section reports a loaded chart', async () => {
    const { onChartLoaded, main$ } = await setup();

    act(() => {
      main$.next({ fetchStatus: FetchStatus.LOADING });
    });
    act(() => {
      onChartLoaded?.();
    });

    expect(main$.getValue().fetchStatus).toBe(FetchStatus.PARTIAL);
  });

  it('should not change main$ when it is already complete', async () => {
    const { onChartLoaded, main$ } = await setup();
    const completeMsg = { fetchStatus: FetchStatus.COMPLETE, foundDocuments: true };

    act(() => {
      main$.next(completeMsg);
    });
    act(() => {
      onChartLoaded?.();
    });

    expect(main$.getValue()).toBe(completeMsg);
  });
});
