/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DiscoverTabType } from '@kbn/discover-utils';
import {
  DataSourceCategory,
  DataSourceProfileService,
  DocumentProfileService,
  RootProfileService,
} from '../../../../context_awareness/profiles';
import type { DataSourceProfileProvider } from '../../../../context_awareness/profiles';
import { ProfilesManager } from '../../../../context_awareness/profiles_manager';
import { EMPTY_CONTEXT_AWARENESS_TOOLKIT } from '../../../../context_awareness/toolkit';
import { DiscoverEBTManager } from '../../../../ebt_manager';
import { DataSourceType } from '../../../../../common/data_sources';
import {
  getRuntimeStateManagerMock,
  getTabRuntimeStateMock,
} from './__mocks__/runtime_state.mocks';
import { getTabStateMock } from './__mocks__/internal_state.mocks';
import { selectCurrentTabType, selectTabTypeForPersistence } from './runtime_state';

const METRICS_PROFILE_ID = 'test-metrics-data-source-profile';

const createScopedProfilesManager = () => {
  const dataSourceProfileService = new DataSourceProfileService();
  const resolve: DataSourceProfileProvider['resolve'] = jest.fn(async ({ query }) => {
    const esqlQuery = 'esql' in (query ?? {}) ? (query as { esql: string }).esql : undefined;

    if (esqlQuery === 'TS metrics-*') {
      return {
        isMatch: true,
        context: { category: DataSourceCategory.Metrics, tabType: DiscoverTabType.Metrics },
      };
    }

    if (esqlQuery === 'FROM logs-*') {
      return { isMatch: true, context: { category: DataSourceCategory.Logs } };
    }

    return { isMatch: false };
  });

  dataSourceProfileService.registerProvider({
    profileId: METRICS_PROFILE_ID,
    profile: {},
    resolve,
  });

  const profilesManager = new ProfilesManager(
    new RootProfileService(),
    dataSourceProfileService,
    new DocumentProfileService()
  );

  return profilesManager.createScopedProfilesManager({
    scopedEbtManager: new DiscoverEBTManager().createScopedEBTManager(),
    toolkit: EMPTY_CONTEXT_AWARENESS_TOOLKIT,
  });
};

describe('selectCurrentTabType', () => {
  it('returns undefined before the data source profile has resolved', () => {
    const scopedProfilesManager = createScopedProfilesManager();
    const runtimeStateManager = getRuntimeStateManagerMock();
    runtimeStateManager.tabs.byId['tab-1'] = getTabRuntimeStateMock();
    runtimeStateManager.tabs.byId['tab-1'].scopedProfilesManager$.next(scopedProfilesManager);

    expect(selectCurrentTabType(runtimeStateManager, 'tab-1')).toBeUndefined();
  });

  it('returns the resolved tab type once the data source profile has resolved', async () => {
    const scopedProfilesManager = createScopedProfilesManager();
    const runtimeStateManager = getRuntimeStateManagerMock();
    runtimeStateManager.tabs.byId['tab-1'] = getTabRuntimeStateMock();
    runtimeStateManager.tabs.byId['tab-1'].scopedProfilesManager$.next(scopedProfilesManager);

    await scopedProfilesManager.resolveDataSourceProfile({
      dataSource: { type: DataSourceType.Esql },
      query: { esql: 'TS metrics-*' },
    });

    expect(selectCurrentTabType(runtimeStateManager, 'tab-1')).toBe(DiscoverTabType.Metrics);
  });
});

describe('selectTabTypeForPersistence', () => {
  it('falls back to the inherited tab type when the tab has never resolved a profile', () => {
    const scopedProfilesManager = createScopedProfilesManager();
    const runtimeStateManager = getRuntimeStateManagerMock();
    runtimeStateManager.tabs.byId['tab-1'] = getTabRuntimeStateMock();
    runtimeStateManager.tabs.byId['tab-1'].scopedProfilesManager$.next(scopedProfilesManager);

    const tabState = getTabStateMock({
      id: 'tab-1',
      initialInternalState: { tabType: DiscoverTabType.Metrics },
    });

    expect(selectTabTypeForPersistence({ runtimeStateManager, tabState })).toBe(
      DiscoverTabType.Metrics
    );
  });

  it('falls back to the inherited tab type before the profile has resolved, even with live runtime state', () => {
    const scopedProfilesManager = createScopedProfilesManager();
    const runtimeStateManager = getRuntimeStateManagerMock();
    runtimeStateManager.tabs.byId['tab-1'] = getTabRuntimeStateMock();
    runtimeStateManager.tabs.byId['tab-1'].scopedProfilesManager$.next(scopedProfilesManager);

    const tabState = getTabStateMock({
      id: 'tab-1',
      initialInternalState: { tabType: DiscoverTabType.Metrics },
    });

    expect(selectTabTypeForPersistence({ runtimeStateManager, tabState })).toBe(
      DiscoverTabType.Metrics
    );
  });

  it('prefers the resolved tab type over the inherited one once resolved -- gaining a type', async () => {
    const scopedProfilesManager = createScopedProfilesManager();
    const runtimeStateManager = getRuntimeStateManagerMock();
    runtimeStateManager.tabs.byId['tab-1'] = getTabRuntimeStateMock();
    runtimeStateManager.tabs.byId['tab-1'].scopedProfilesManager$.next(scopedProfilesManager);

    await scopedProfilesManager.resolveDataSourceProfile({
      dataSource: { type: DataSourceType.Esql },
      query: { esql: 'TS metrics-*' },
    });

    const tabState = getTabStateMock({ id: 'tab-1' });

    expect(selectTabTypeForPersistence({ runtimeStateManager, tabState })).toBe(
      DiscoverTabType.Metrics
    );
  });

  it('drops the inherited tab type once resolved to a profile with none -- losing a type', async () => {
    const scopedProfilesManager = createScopedProfilesManager();
    const runtimeStateManager = getRuntimeStateManagerMock();
    runtimeStateManager.tabs.byId['tab-1'] = getTabRuntimeStateMock();
    runtimeStateManager.tabs.byId['tab-1'].scopedProfilesManager$.next(scopedProfilesManager);

    await scopedProfilesManager.resolveDataSourceProfile({
      dataSource: { type: DataSourceType.Esql },
      query: { esql: 'FROM logs-*' },
    });

    // The tab was previously saved with a metrics type, but its query now resolves to logs.
    const tabState = getTabStateMock({
      id: 'tab-1',
      initialInternalState: { tabType: DiscoverTabType.Metrics },
    });

    expect(selectTabTypeForPersistence({ runtimeStateManager, tabState })).toBeUndefined();
  });
});
