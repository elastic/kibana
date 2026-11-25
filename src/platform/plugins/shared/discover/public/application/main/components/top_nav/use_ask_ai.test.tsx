/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { useIsNlToEsqlAvailable } from '@kbn/esql/public';
import { ENABLE_ESQL } from '@kbn/esql-utils';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import { getDiscoverInternalStateMock } from '../../../../__mocks__/discover_state.mock';
import { DiscoverToolkitTestProvider } from '../../../../__mocks__/test_provider';
import {
  DiscoverCustomizationContextProvider,
  type DiscoverDisplayMode,
} from '../../../../customizations';
import { defaultCustomizationContext } from '../../../../customizations/defaults';
import { createEsqlDataSource } from '../../../../../common/data_sources';
import { internalStateActions } from '../../state_management/redux';
import { getAskAiSuggestedPrompts } from './ask_ai_prompts';
import { useAskAi } from './use_ask_ai';

jest.mock('@kbn/esql/public', () => ({
  ...jest.requireActual('@kbn/esql/public'),
  useIsNlToEsqlAvailable: jest.fn(),
}));

const setup = async ({
  displayMode = 'standalone',
  isByValueEditor = false,
  isEsqlMode = false,
  lookupIndices = [],
}: {
  displayMode?: DiscoverDisplayMode;
  isByValueEditor?: boolean;
  isEsqlMode?: boolean;
  lookupIndices?: Array<{ name: string; isClosed?: boolean }>;
} = {}) => {
  const services = createDiscoverServicesMock();
  services.http.get = jest.fn().mockResolvedValue({ indices: lookupIndices });
  (services.embeddableEditor.isByValueEditor as jest.Mock).mockReturnValue(isByValueEditor);
  const getUiSetting = (services.uiSettings.get as jest.Mock).getMockImplementation();
  (services.uiSettings.get as jest.Mock).mockImplementation((key: string) =>
    key === ENABLE_ESQL ? true : getUiSetting?.(key)
  );
  const toolkit = getDiscoverInternalStateMock({ services, persistedDataViews: [dataViewMock] });
  await toolkit.initializeTabs();
  const tabId = toolkit.getCurrentTab().id;
  toolkit.internalState.dispatch(
    internalStateActions.setSkipInitialFetch({ tabId, skipInitialFetch: true })
  );
  if (isEsqlMode) {
    toolkit.internalState.dispatch(
      internalStateActions.updateAppState({
        tabId,
        appState: { dataSource: createEsqlDataSource(), query: { esql: 'FROM logs' } },
      })
    );
  }
  await toolkit.initializeSingleTab({ tabId, skipWaitForDataFetching: true });
  if (!isEsqlMode) {
    toolkit.internalState.dispatch(
      internalStateActions.setDataView({ tabId, dataView: dataViewMock })
    );
  }
  const { result } = renderHook(() => useAskAi(), {
    wrapper: ({ children }) => (
      <DiscoverToolkitTestProvider toolkit={toolkit}>
        <DiscoverCustomizationContextProvider
          value={{ ...defaultCustomizationContext, displayMode }}
        >
          {children}
        </DiscoverCustomizationContextProvider>
      </DiscoverToolkitTestProvider>
    ),
  });
  return { tabId, result, services };
};

describe('useAskAi', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns undefined when natural language to ES|QL is unavailable', async () => {
    (useIsNlToEsqlAvailable as jest.Mock).mockReturnValue(false);
    const { result } = await setup();

    expect(result.current).toBeUndefined();
  });

  it.each([
    ['in embedded mode', { displayMode: 'embedded' as const }],
    ['in the by-value embeddable editor', { isByValueEditor: true }],
  ])('returns undefined when tabs are disabled %s', async (_, options) => {
    (useIsNlToEsqlAvailable as jest.Mock).mockReturnValue(true);
    const { result } = await setup(options);

    expect(result.current).toBeUndefined();
  });

  it('returns undefined and requests no lookup indices on an ES|QL tab', async () => {
    (useIsNlToEsqlAvailable as jest.Mock).mockReturnValue(true);
    const { result, services } = await setup({ isEsqlMode: true });

    expect(result.current).toBeUndefined();
    expect(services.http.get).not.toHaveBeenCalled();
  });

  it('asks for the query in a new ES|QL tab with the submitted prompt from the current data view', async () => {
    (useIsNlToEsqlAvailable as jest.Mock).mockReturnValue(true);
    const openAskInEsqlTab = jest
      .spyOn(internalStateActions, 'openAskInEsqlTab')
      .mockReturnValue(() => Promise.resolve());
    const { tabId, result } = await setup();
    const { signal } = new AbortController();

    await act(() => result.current?.onSubmit('show me logs', signal));

    expect(openAskInEsqlTab).toHaveBeenCalledWith({
      tabId,
      dataView: dataViewMock,
      prompt: 'show me logs',
      signal,
    });
  });

  it('suggests joining with an open lookup index only when there is one', async () => {
    (useIsNlToEsqlAvailable as jest.Mock).mockReturnValue(true);
    const withoutLookup = await setup({
      lookupIndices: [{ name: 'closed_lookup', isClosed: true }],
    });
    // Lets the lookup response settle before checking that the closed index was not suggested
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(withoutLookup.services.http.get).toHaveBeenCalled();
    expect(withoutLookup.result.current?.suggestedPrompts).toEqual(getAskAiSuggestedPrompts());

    const withLookup = await setup({
      lookupIndices: [{ name: 'closed_lookup', isClosed: true }, { name: 'hosts_lookup' }],
    });
    await waitFor(() =>
      expect(withLookup.result.current?.suggestedPrompts).toEqual(
        getAskAiSuggestedPrompts('hosts_lookup')
      )
    );
    expect(withLookup.result.current?.suggestedPrompts).toContain(
      'Add details from hosts_lookup matched on <field1>'
    );
  });
});
