/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isValidElement } from 'react';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { buildDataTableRecord } from '@kbn/discover-utils';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import {
  ExpandedDocLinkability,
  getExpandedDocLinkDisabledReason,
} from '../../../utils/expanded_doc';
import type { DiscoverAppState } from '../../../state_management/redux';
import { createDiscoverServicesMock } from '../../../../../__mocks__/services';
import { buildShareOptions } from './get_share';
import {
  getDiscoverInternalStateMock,
  type InternalStateMockToolkit,
} from '../../../../../__mocks__/discover_state.mock';
import { FetchStatus } from '../../../../types';
import { internalStateActions, selectTabRuntimeState } from '../../../state_management/redux';
import { ESQLVariableType } from '@kbn/esql-types';
import { TEST_PROFILE_STATE_DEF } from '../../../../../context_awareness/__mocks__/profile_state';
import { EXAMPLE_PROFILE_STATE_DEF } from '../../../../../../common/context_awareness';

const mockDiscoverService = createDiscoverServicesMock();

describe('getShare', () => {
  let toolkit: InternalStateMockToolkit;

  beforeAll(async () => {
    mockDiscoverService.profileStateRegistry.registerDefinition(TEST_PROFILE_STATE_DEF);
    mockDiscoverService.profileStateRegistry.registerDefinition(EXAMPLE_PROFILE_STATE_DEF);
    toolkit = getDiscoverInternalStateMock({
      services: mockDiscoverService,
      persistedDataViews: [dataViewMock],
    });

    await toolkit.initializeTabs();
    await toolkit.initializeSingleTab({ tabId: toolkit.getCurrentTab().id });

    toolkit.internalState.dispatch(
      internalStateActions.setDataView({
        tabId: toolkit.getCurrentTab().id,
        dataView: dataViewMock,
      })
    );
  });

  it('uses dataRequestParams.timeRangeAbsolute as absoluteTimeRange in ES|QL mode when available', async () => {
    const lastFetchAbsoluteRange = {
      from: '2025-01-01T00:00:00.000Z',
      to: '2025-01-01T00:15:00.000Z',
    };

    toolkit.internalState.dispatch(
      internalStateActions.setDataRequestParams({
        tabId: toolkit.getCurrentTab().id,
        dataRequestParams: {
          timeRangeAbsolute: lastFetchAbsoluteRange,
          timeRangeRelative: { from: 'now-15m', to: 'now' },
          searchSessionId: undefined,
          isSearchSessionRestored: false,
        },
      })
    );

    const shareOptions = await buildShareOptions({
      services: mockDiscoverService,
      discoverParams: {
        dataView: dataViewMock,
        isEsqlMode: true,
        adHocDataViews: [],
        authorizedRuleTypeIds: [],
      },
      currentTab: toolkit.getCurrentTab(),
      runtimeStateManager: toolkit.runtimeStateManager,
      persistedDiscoverSession: undefined,
      totalHitsState: { result: 0, fetchStatus: FetchStatus.COMPLETE },
      hasUnsavedChanges: false,
    });

    expect(shareOptions.sharingData.absoluteTimeRange).toEqual(lastFetchAbsoluteRange);
  });

  it('should return the correct share options, without absolute time range set when in classic mode', async () => {
    const shareOptions = await buildShareOptions({
      services: mockDiscoverService,
      discoverParams: {
        dataView: dataViewMock,
        isEsqlMode: false,
        adHocDataViews: [],
        authorizedRuleTypeIds: [],
      },
      currentTab: toolkit.getCurrentTab(),
      runtimeStateManager: toolkit.runtimeStateManager,
      persistedDiscoverSession: undefined,
      totalHitsState: { result: 0, fetchStatus: FetchStatus.COMPLETE },
      hasUnsavedChanges: false,
    });

    expect(shareOptions).toEqual(
      expect.objectContaining({
        allowShortUrl: false,
        shareableUrl: 'http://localhost/',
        shareableUrlForSavedObject: '#?_g=()',
        sharingData: expect.objectContaining({
          isTextBased: false,
          absoluteTimeRange: undefined,
          locatorParams: expect.arrayContaining([
            expect.objectContaining({
              id: undefined,
              version: 'major.minor.patch',
              params: expect.objectContaining({
                timeRange: expect.objectContaining({
                  from: expect.any(String),
                  to: expect.any(String),
                }),
                dataViewId: dataViewMock.id,
              }),
            }),
          ]),
        }),
        objectId: undefined,
        objectType: 'search',
        objectTypeAlias: 'Discover session',
      })
    );
  });

  it('should include esqlVariables in locator params when in ES|QL mode with active controls', async () => {
    const esqlVariables = [{ key: 'crew_id', value: '123', type: ESQLVariableType.VALUES }];

    toolkit.internalState.dispatch(
      internalStateActions.setEsqlVariables({
        tabId: toolkit.getCurrentTab().id,
        esqlVariables,
      })
    );

    const shareOptions = await buildShareOptions({
      services: mockDiscoverService,
      discoverParams: {
        dataView: dataViewMock,
        isEsqlMode: true,
        adHocDataViews: [],
        authorizedRuleTypeIds: [],
      },
      currentTab: toolkit.getCurrentTab(),
      runtimeStateManager: toolkit.runtimeStateManager,
      persistedDiscoverSession: undefined,
      totalHitsState: { result: 0, fetchStatus: FetchStatus.COMPLETE },
      hasUnsavedChanges: false,
    });

    expect(shareOptions.sharingData.locatorParams[0].params).toEqual(
      expect.objectContaining({
        esqlVariables,
      })
    );

    // clean up so subsequent tests start with no variables
    toolkit.internalState.dispatch(
      internalStateActions.setEsqlVariables({
        tabId: toolkit.getCurrentTab().id,
        esqlVariables: undefined,
      })
    );
  });

  it('should return the correct share options, with absolute time range set when in ES|QL mode', async () => {
    const shareOptions = await buildShareOptions({
      services: mockDiscoverService,
      discoverParams: {
        dataView: dataViewMock,
        isEsqlMode: true,
        adHocDataViews: [],
        authorizedRuleTypeIds: [],
      },
      currentTab: toolkit.getCurrentTab(),
      runtimeStateManager: toolkit.runtimeStateManager,
      persistedDiscoverSession: undefined,
      totalHitsState: { result: 0, fetchStatus: FetchStatus.COMPLETE },
      hasUnsavedChanges: false,
    });

    expect(shareOptions).toEqual(
      expect.objectContaining({
        allowShortUrl: false,
        shareableUrl: 'http://localhost/',
        shareableUrlForSavedObject: '#?_g=()',
        sharingData: expect.objectContaining({
          isTextBased: true,
          absoluteTimeRange: expect.objectContaining({
            from: expect.any(String),
            to: expect.any(String),
          }),
          locatorParams: expect.arrayContaining([
            expect.objectContaining({
              id: undefined,
              version: 'major.minor.patch',
              params: expect.objectContaining({
                timeRange: expect.objectContaining({
                  from: expect.any(String),
                  to: expect.any(String),
                }),
                dataViewId: dataViewMock.id,
              }),
            }),
          ]),
        }),
        objectId: undefined,
        objectType: 'search',
        objectTypeAlias: 'Discover session',
      })
    );
  });

  it('includes active profile locator defaults without explicit state', async () => {
    const currentTab = toolkit.getCurrentTab();
    const scopedProfilesManager = selectTabRuntimeState(
      toolkit.runtimeStateManager,
      currentTab.id
    ).scopedProfilesManager$.getValue();
    const contexts = scopedProfilesManager.getContexts();
    const getContextsSpy = jest.spyOn(scopedProfilesManager, 'getContexts').mockReturnValue({
      ...contexts,
      dataSourceContext: {
        ...contexts.dataSourceContext,
        profileState: TEST_PROFILE_STATE_DEF,
      },
    });

    const shareOptions = await buildShareOptions({
      services: mockDiscoverService,
      discoverParams: {
        dataView: dataViewMock,
        isEsqlMode: false,
        adHocDataViews: [],
        authorizedRuleTypeIds: [],
      },
      currentTab,
      runtimeStateManager: toolkit.runtimeStateManager,
      persistedDiscoverSession: undefined,
      totalHitsState: { result: 0, fetchStatus: FetchStatus.COMPLETE },
      hasUnsavedChanges: false,
    });

    expect(shareOptions.sharingData.locatorParams[0].params.profileState).toEqual({
      [TEST_PROFILE_STATE_DEF.key]: {
        urlValue: 'defaultUrl',
        persistentValue: 'defaultPersistent',
      },
    });

    getContextsSpy.mockRestore();
  });

  it('includes expanded active profile locator state without UI state', async () => {
    const currentTab = toolkit.getCurrentTab();
    const scopedProfilesManager = selectTabRuntimeState(
      toolkit.runtimeStateManager,
      currentTab.id
    ).scopedProfilesManager$.getValue();
    const contexts = scopedProfilesManager.getContexts();
    const getContextsSpy = jest.spyOn(scopedProfilesManager, 'getContexts').mockReturnValue({
      ...contexts,
      dataSourceContext: {
        ...contexts.dataSourceContext,
        profileState: TEST_PROFILE_STATE_DEF,
      },
    });

    toolkit.internalState.dispatch(
      internalStateActions.setProfileState({
        tabId: currentTab.id,
        profileStateDefinition: TEST_PROFILE_STATE_DEF,
        profileState: {
          ...TEST_PROFILE_STATE_DEF.defaultState,
          uiValue: 'customUi',
          urlValue: 'customUrl',
        },
      })
    );
    toolkit.internalState.dispatch(
      internalStateActions.setProfileState({
        tabId: currentTab.id,
        profileStateDefinition: EXAMPLE_PROFILE_STATE_DEF,
        profileState: {
          ...EXAMPLE_PROFILE_STATE_DEF.defaultState,
          boxColor: 'danger',
        },
      })
    );

    const shareOptions = await buildShareOptions({
      services: mockDiscoverService,
      discoverParams: {
        dataView: dataViewMock,
        isEsqlMode: false,
        adHocDataViews: [],
        authorizedRuleTypeIds: [],
      },
      currentTab: toolkit.getCurrentTab(),
      runtimeStateManager: toolkit.runtimeStateManager,
      persistedDiscoverSession: undefined,
      totalHitsState: { result: 0, fetchStatus: FetchStatus.COMPLETE },
      hasUnsavedChanges: false,
    });

    const shareableUrlLocatorParams = shareOptions.shareableUrlLocatorParams;
    if (!shareableUrlLocatorParams) {
      throw new Error('Expected snapshot locator params');
    }

    expect(shareableUrlLocatorParams.params.profileState).toEqual({
      [TEST_PROFILE_STATE_DEF.key]: {
        urlValue: 'customUrl',
        persistentValue: 'defaultPersistent',
      },
    });
    expect(shareOptions.sharingData.locatorParams[0].params.profileState).toEqual(
      shareableUrlLocatorParams.params.profileState
    );

    getContextsSpy.mockRestore();
  });

  describe('expanded document link callout', () => {
    const buildOptions = () =>
      buildShareOptions({
        services: mockDiscoverService,
        discoverParams: {
          dataView: dataViewMock,
          isEsqlMode: false,
          adHocDataViews: [],
          authorizedRuleTypeIds: [],
        },
        currentTab: toolkit.getCurrentTab(),
        runtimeStateManager: toolkit.runtimeStateManager,
        persistedDiscoverSession: undefined,
        totalHitsState: { result: 0, fetchStatus: FetchStatus.COMPLETE },
        hasUnsavedChanges: false,
      });

    const expandedDoc = buildDataTableRecord({ _id: '1', _index: 'i' }, dataViewMock);
    const expandedDocWithoutMetadata = buildDataTableRecord(
      { _source: { message: 'no metadata' } },
      dataViewMock
    );

    const setExpandedDoc = (doc: DataTableRecord | undefined) => {
      toolkit.internalState.dispatch(
        internalStateActions.setExpandedDoc({
          tabId: toolkit.getCurrentTab().id,
          expandedDoc: doc,
        })
      );
    };

    const setQuery = (query: DiscoverAppState['query']) => {
      toolkit.internalState.dispatch(
        internalStateActions.updateAppState({
          tabId: toolkit.getCurrentTab().id,
          appState: { query },
        })
      );
    };

    // `getTime` is a fixed stub, so configure it directly.
    const setTimeRange = (timeRange: { from: string; to: string }) => {
      jest
        .mocked(mockDiscoverService.data.query.timefilter.timefilter.getTime)
        .mockReturnValue(timeRange);
    };

    const getHelpTextProps = async () => {
      const shareOptions = await buildOptions();
      const helpText = shareOptions.objectTypeMeta.config?.link?.helpText;

      return isValidElement<{ title: string; text: string }>(helpText) ? helpText.props : undefined;
    };

    afterEach(() => {
      setExpandedDoc(undefined);
      setQuery({ query: '', language: 'kuery' });
      setTimeRange({ from: 'now-15m', to: 'now' });
    });

    it('warns that a relative time range may not contain the linked document', async () => {
      setQuery({ query: '', language: 'kuery' });
      setTimeRange({ from: 'now-15m', to: 'now' });
      setExpandedDoc(expandedDoc);

      expect((await getHelpTextProps())?.title).toBe('This link includes an open document');
    });

    it('refers to an open result for an ES|QL query with a relative time range', async () => {
      setQuery({ esql: 'FROM logs METADATA _id, _index' });
      setTimeRange({ from: 'now-15m', to: 'now' });
      setExpandedDoc(expandedDoc);

      expect((await getHelpTextProps())?.title).toBe('This link includes an open result');
    });

    it('does not warn when the time range is already absolute', async () => {
      setQuery({ query: '', language: 'kuery' });
      setTimeRange({ from: '2025-01-01T00:00:00.000Z', to: '2025-01-02T00:00:00.000Z' });
      setExpandedDoc(expandedDoc);

      expect(await getHelpTextProps()).toBeUndefined();
    });

    it('does not warn when no document is expanded', async () => {
      setTimeRange({ from: 'now-15m', to: 'now' });

      expect(await getHelpTextProps()).toBeUndefined();
    });

    it('explains when the expanded document is missing _id/_index', async () => {
      setQuery({ esql: 'FROM logs' });
      setExpandedDoc(expandedDocWithoutMetadata);

      const props = await getHelpTextProps();

      expect(props?.title).toBe("This link won't include the open result");
      expect(props?.text).toBe(
        getExpandedDocLinkDisabledReason(ExpandedDocLinkability.EsqlMissingMetadata)
      );
    });

    it('explains when an ES|QL query transforms its rows', async () => {
      setQuery({ esql: 'FROM logs METADATA _id, _index | STATS count() BY host' });
      setExpandedDoc(expandedDoc);

      const props = await getHelpTextProps();

      expect(props?.title).toBe("This link won't include the open result");
      expect(props?.text).toBe(
        getExpandedDocLinkDisabledReason(ExpandedDocLinkability.EsqlTransformational)
      );
    });

    it('reports the unlinkable reason ahead of the relative time range', async () => {
      setQuery({ esql: 'FROM logs' });
      setTimeRange({ from: 'now-15m', to: 'now' });
      setExpandedDoc(expandedDocWithoutMetadata);

      expect((await getHelpTextProps())?.title).toBe("This link won't include the open result");
    });
  });
});
