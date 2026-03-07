/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dataViewMockWithTimeField } from '@kbn/discover-utils/src/__mocks__';
import { createDiscoverSessionMock } from '@kbn/saved-search-plugin/common/mocks';
import { DataSourceType } from '../../../../../common/data_sources';
import { getDiscoverInternalStateMock } from '../../../../__mocks__/discover_state.mock';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import { getPersistedTabMock } from './__mocks__/internal_state.mocks';
import { createContextAwarenessToolkit } from './context_awareness_toolkit';
import { internalStateActions } from '.';

describe('createContextAwarenessToolkit', () => {
  const setup = async () => {
    const services = createDiscoverServicesMock();
    const toolkit = getDiscoverInternalStateMock({
      services,
      persistedDataViews: [dataViewMockWithTimeField],
    });

    const persistedTab = getPersistedTabMock({
      dataView: dataViewMockWithTimeField,
      services,
      appStateOverrides: {
        query: { esql: 'FROM test-index' },
        dataSource: { type: DataSourceType.Esql },
      },
    });

    await toolkit.initializeTabs({
      persistedDiscoverSession: createDiscoverSessionMock({
        id: 'test-session',
        tabs: [persistedTab],
      }),
    });

    return { internalState: toolkit.internalState, tabId: persistedTab.id };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('wires updateESQLQuery to updateESQLQuery action with tab id', async () => {
    const { internalState, tabId } = await setup();
    const updateEsqlQuerySpy = jest.spyOn(internalStateActions, 'updateESQLQuery');
    const queryOrUpdater = 'FROM logs-*';

    createContextAwarenessToolkit({ internalState, tabId }).actions.updateESQLQuery?.(
      queryOrUpdater
    );

    expect(updateEsqlQuerySpy).toHaveBeenCalledWith({ tabId, queryOrUpdater });
  });

  it('wires addFilter to addFilter action with tab id', async () => {
    const { internalState, tabId } = await setup();
    const addFilterSpy = jest.spyOn(internalStateActions, 'addFilter');

    createContextAwarenessToolkit({ internalState, tabId }).actions.addFilter?.('status', 200, '+');

    expect(addFilterSpy).toHaveBeenCalledWith({
      tabId,
      field: 'status',
      value: 200,
      mode: '+',
    });
  });

  it('maps setExpandedDoc options.initialTabId to initialDocViewerTabId', async () => {
    const { internalState, tabId } = await setup();
    const setExpandedDocSpy = jest.spyOn(internalStateActions, 'setExpandedDoc');

    createContextAwarenessToolkit({ internalState, tabId }).actions.setExpandedDoc?.(undefined, {
      initialTabId: 'overview',
    });

    expect(setExpandedDocSpy).toHaveBeenCalledWith({
      tabId,
      expandedDoc: undefined,
      initialDocViewerTabId: 'overview',
    });
  });

  it('dispatches openInNewTab through openInNewTabExtPointAction', async () => {
    const { internalState, tabId } = await setup();
    const openInNewTabSpy = jest.spyOn(internalStateActions, 'openInNewTabExtPointAction');
    const params = {
      query: { esql: 'FROM logs-*' },
      timeRange: { from: 'now-15m', to: 'now' },
      tabLabel: 'Logs',
    };

    createContextAwarenessToolkit({ internalState, tabId }).actions.openInNewTab?.(params);

    expect(openInNewTabSpy).toHaveBeenCalledWith(params);
  });

  it('awaits updateAdHocDataViews dispatch', async () => {
    const { internalState, tabId } = await setup();
    const updateAdHocDataViewsSpy = jest.spyOn(internalStateActions, 'updateAdHocDataViews');
    const adHocDataViews = [dataViewMockWithTimeField];

    await createContextAwarenessToolkit({ internalState, tabId }).actions.updateAdHocDataViews?.(
      adHocDataViews
    );

    expect(updateAdHocDataViewsSpy).toHaveBeenCalledWith(adHocDataViews);
  });
});
