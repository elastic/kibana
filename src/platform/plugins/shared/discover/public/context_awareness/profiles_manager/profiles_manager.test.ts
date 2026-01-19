/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { firstValueFrom, Subject } from 'rxjs';
import { createEsqlDataSource } from '../../../common/data_sources';
import { addLog } from '../../utils/add_log';
import { SolutionType } from '../profiles/root_profile';
import { createContextAwarenessMocks } from '../__mocks__';
import type { ComposableProfile } from '../composable_profile';

jest.mock('../../utils/add_log');

let mocks = createContextAwarenessMocks();

const toAppliedProfile = (profile: ComposableProfile<{}, {}>) =>
  Object.keys(profile).reduce((acc, key) => ({ ...acc, [key]: expect.any(Function) }), {});

describe('ProfilesManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocks = createContextAwarenessMocks();
    jest.spyOn(mocks.scopedEbtManagerMock, 'updateProfilesContextWith');
    jest.spyOn(mocks.scopedEbtManagerMock, 'trackContextualProfileResolvedEvent');
  });

  it('should return default profiles', () => {
    const scopedProfilesManager = mocks.profilesManagerMock.createScopedProfilesManager({
      scopedEbtManager: mocks.scopedEbtManagerMock,
    });
    const profiles = scopedProfilesManager.getProfiles();
    expect(profiles).toEqual([{}, {}, {}]);
  });

  it('should resolve root profile', async () => {
    await mocks.profilesManagerMock.resolveRootProfile({});
    const scopedProfilesManager = mocks.profilesManagerMock.createScopedProfilesManager({
      scopedEbtManager: mocks.scopedEbtManagerMock,
    });
    const profiles = scopedProfilesManager.getProfiles();
    expect(profiles).toEqual([toAppliedProfile(mocks.rootProfileProviderMock.profile), {}, {}]);
  });

  it('should resolve data source profile', async () => {
    const scopedProfilesManager = mocks.profilesManagerMock.createScopedProfilesManager({
      scopedEbtManager: mocks.scopedEbtManagerMock,
    });
    await scopedProfilesManager.resolveDataSourceProfile({});
    const profiles = scopedProfilesManager.getProfiles();
    expect(profiles).toEqual([
      {},
      toAppliedProfile(mocks.dataSourceProfileProviderMock.profile),
      {},
    ]);
  });

  it('should resolve document profile', async () => {
    const scopedProfilesManager = mocks.profilesManagerMock.createScopedProfilesManager({
      scopedEbtManager: mocks.scopedEbtManagerMock,
    });
    const record = scopedProfilesManager.resolveDocumentProfile({
      record: mocks.contextRecordMock,
    });
    const profiles = scopedProfilesManager.getProfiles({ record });
    expect(profiles).toEqual([{}, {}, toAppliedProfile(mocks.documentProfileProviderMock.profile)]);
  });

  it('should resolve multiple profiles', async () => {
    await mocks.profilesManagerMock.resolveRootProfile({});
    const scopedProfilesManager = mocks.profilesManagerMock.createScopedProfilesManager({
      scopedEbtManager: mocks.scopedEbtManagerMock,
    });
    await scopedProfilesManager.resolveDataSourceProfile({});
    const record = scopedProfilesManager.resolveDocumentProfile({
      record: mocks.contextRecordMock,
    });
    const profiles = scopedProfilesManager.getProfiles({ record });
    expect(profiles).toEqual([
      toAppliedProfile(mocks.rootProfileProviderMock.profile),
      toAppliedProfile(mocks.dataSourceProfileProviderMock.profile),
      toAppliedProfile(mocks.documentProfileProviderMock.profile),
    ]);

    expect(mocks.scopedEbtManagerMock.updateProfilesContextWith).toHaveBeenCalledWith([
      'root-profile',
      'data-source-profile',
    ]);

    expect(mocks.scopedEbtManagerMock.trackContextualProfileResolvedEvent).toHaveBeenNthCalledWith(
      1,
      {
        profileId: 'root-profile',
        contextLevel: 'rootLevel',
      }
    );
    expect(mocks.scopedEbtManagerMock.trackContextualProfileResolvedEvent).toHaveBeenNthCalledWith(
      2,
      {
        profileId: 'data-source-profile',
        contextLevel: 'dataSourceLevel',
      }
    );
  });

  it('should expose profiles as an observable', async () => {
    const scopedProfilesManager = mocks.profilesManagerMock.createScopedProfilesManager({
      scopedEbtManager: mocks.scopedEbtManagerMock,
    });
    const getProfilesSpy = jest.spyOn(scopedProfilesManager, 'getProfiles');
    const record = scopedProfilesManager.resolveDocumentProfile({
      record: mocks.contextRecordMock,
    });
    const profiles$ = scopedProfilesManager.getProfiles$({ record });
    const next = jest.fn();
    profiles$.subscribe(next);
    expect(getProfilesSpy).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith([
      {},
      {},
      toAppliedProfile(mocks.documentProfileProviderMock.profile),
    ]);
    await mocks.profilesManagerMock.resolveRootProfile({});
    expect(getProfilesSpy).toHaveBeenCalledTimes(2);
    expect(next).toHaveBeenCalledWith([
      toAppliedProfile(mocks.rootProfileProviderMock.profile),
      {},
      toAppliedProfile(mocks.documentProfileProviderMock.profile),
    ]);
    await scopedProfilesManager.resolveDataSourceProfile({});
    expect(getProfilesSpy).toHaveBeenCalledTimes(3);
    expect(next).toHaveBeenCalledWith([
      toAppliedProfile(mocks.rootProfileProviderMock.profile),
      toAppliedProfile(mocks.dataSourceProfileProviderMock.profile),
      toAppliedProfile(mocks.documentProfileProviderMock.profile),
    ]);
  });

  it("should not resolve root profile again if params haven't changed", async () => {
    await mocks.profilesManagerMock.resolveRootProfile({ solutionNavId: 'solutionNavId' });
    await mocks.profilesManagerMock.resolveRootProfile({ solutionNavId: 'solutionNavId' });
    expect(mocks.rootProfileProviderMock.resolve).toHaveBeenCalledTimes(1);
  });

  it('should resolve root profile again if params have changed', async () => {
    await mocks.profilesManagerMock.resolveRootProfile({ solutionNavId: 'solutionNavId' });
    await mocks.profilesManagerMock.resolveRootProfile({ solutionNavId: 'newSolutionNavId' });
    expect(mocks.rootProfileProviderMock.resolve).toHaveBeenCalledTimes(2);
  });

  it('should not resolve data source profile again if params have not changed', async () => {
    const scopedProfilesManager = mocks.profilesManagerMock.createScopedProfilesManager({
      scopedEbtManager: mocks.scopedEbtManagerMock,
    });
    await scopedProfilesManager.resolveDataSourceProfile({
      dataSource: createEsqlDataSource(),
      query: { esql: 'from *' },
    });
    expect(mocks.dataSourceProfileProviderMock.resolve).toHaveBeenCalledTimes(1);
    await scopedProfilesManager.resolveDataSourceProfile({
      dataSource: createEsqlDataSource(),
      query: { esql: 'from *' },
    });
    expect(mocks.dataSourceProfileProviderMock.resolve).toHaveBeenCalledTimes(1);
  });

  it('should resolve data source profile again if params have changed', async () => {
    const scopedProfilesManager = mocks.profilesManagerMock.createScopedProfilesManager({
      scopedEbtManager: mocks.scopedEbtManagerMock,
    });
    await scopedProfilesManager.resolveDataSourceProfile({
      dataSource: createEsqlDataSource(),
      query: { esql: 'from *' },
    });
    expect(mocks.dataSourceProfileProviderMock.resolve).toHaveBeenCalledTimes(1);
    await scopedProfilesManager.resolveDataSourceProfile({
      dataSource: createEsqlDataSource(),
      query: { esql: 'from logs-*' },
    });
    expect(mocks.dataSourceProfileProviderMock.resolve).toHaveBeenCalledTimes(2);
  });

  it('should log an error and fall back to the default profile if root profile resolution fails', async () => {
    await mocks.profilesManagerMock.resolveRootProfile({ solutionNavId: 'solutionNavId' });
    const scopedProfilesManager = mocks.profilesManagerMock.createScopedProfilesManager({
      scopedEbtManager: mocks.scopedEbtManagerMock,
    });
    let profiles = scopedProfilesManager.getProfiles();
    expect(profiles).toEqual([toAppliedProfile(mocks.rootProfileProviderMock.profile), {}, {}]);
    const resolveSpy = jest.spyOn(mocks.rootProfileProviderMock, 'resolve');
    resolveSpy.mockRejectedValue(new Error('Failed to resolve'));
    await mocks.profilesManagerMock.resolveRootProfile({ solutionNavId: 'newSolutionNavId' });
    expect(addLog).toHaveBeenCalledWith(
      '[ProfilesManager] rootLevel context resolution failed with params: {\n  "solutionNavId": "newSolutionNavId"\n}',
      new Error('Failed to resolve')
    );
    profiles = scopedProfilesManager.getProfiles();
    expect(profiles).toEqual([{}, {}, {}]);
  });

  it('should log an error and fall back to the default profile if data source profile resolution fails', async () => {
    const scopedProfilesManager = mocks.profilesManagerMock.createScopedProfilesManager({
      scopedEbtManager: mocks.scopedEbtManagerMock,
    });
    await scopedProfilesManager.resolveDataSourceProfile({
      dataSource: createEsqlDataSource(),
      query: { esql: 'from *' },
    });
    let profiles = scopedProfilesManager.getProfiles();
    expect(profiles).toEqual([
      {},
      toAppliedProfile(mocks.dataSourceProfileProviderMock.profile),
      {},
    ]);
    const resolveSpy = jest.spyOn(mocks.dataSourceProfileProviderMock, 'resolve');
    resolveSpy.mockRejectedValue(new Error('Failed to resolve'));
    await scopedProfilesManager.resolveDataSourceProfile({
      dataSource: createEsqlDataSource(),
      query: { esql: 'from logs-*' },
    });
    expect(addLog).toHaveBeenCalledWith(
      '[ProfilesManager] dataSourceLevel context resolution failed with params: {\n  "esqlQuery": "from logs-*"\n}',
      new Error('Failed to resolve')
    );
    profiles = scopedProfilesManager.getProfiles();
    expect(profiles).toEqual([{}, {}, {}]);
  });

  it('should log an error and fall back to the default profile if document profile resolution fails', () => {
    const scopedProfilesManager = mocks.profilesManagerMock.createScopedProfilesManager({
      scopedEbtManager: mocks.scopedEbtManagerMock,
    });
    const record = scopedProfilesManager.resolveDocumentProfile({
      record: mocks.contextRecordMock,
    });
    let profiles = scopedProfilesManager.getProfiles({ record });
    expect(profiles).toEqual([{}, {}, toAppliedProfile(mocks.documentProfileProviderMock.profile)]);
    const resolveSpy = jest.spyOn(mocks.documentProfileProviderMock, 'resolve');
    resolveSpy.mockImplementation(() => {
      throw new Error('Failed to resolve');
    });
    const record2 = scopedProfilesManager.resolveDocumentProfile({
      record: mocks.contextRecordMock2,
    });
    profiles = scopedProfilesManager.getProfiles({ record: record2 });
    expect(addLog).toHaveBeenCalledWith(
      '[ProfilesManager] documentLevel context resolution failed with params: {\n  "recordId": "logstash-2014.09.09::388::"\n}',
      new Error('Failed to resolve')
    );
    expect(profiles).toEqual([{}, {}, {}]);
    expect(mocks.scopedEbtManagerMock.trackContextualProfileResolvedEvent).toHaveBeenCalledWith({
      profileId: 'document-profile',
      contextLevel: 'documentLevel',
    });
  });

  it('should cancel existing root profile resolution when another is triggered', async () => {
    const context = await mocks.rootProfileProviderMock.resolve({ solutionNavId: 'solutionNavId' });
    const newContext = await mocks.rootProfileProviderMock.resolve({
      solutionNavId: 'newSolutionNavId',
    });
    const resolveSpy = jest.spyOn(mocks.rootProfileProviderMock, 'resolve');
    resolveSpy.mockClear();
    const resolvedDeferredResult$ = new Subject();
    const deferredResult = firstValueFrom(resolvedDeferredResult$).then(() => context);
    resolveSpy.mockResolvedValueOnce(deferredResult);
    const promise1 = mocks.profilesManagerMock.resolveRootProfile({
      solutionNavId: 'solutionNavId',
    });
    expect(resolveSpy).toHaveReturnedTimes(1);
    expect(resolveSpy).toHaveLastReturnedWith(deferredResult);
    const scopedProfilesManager = mocks.profilesManagerMock.createScopedProfilesManager({
      scopedEbtManager: mocks.scopedEbtManagerMock,
    });
    expect(scopedProfilesManager.getProfiles()).toEqual([{}, {}, {}]);
    const resolvedDeferredResult2$ = new Subject();
    const deferredResult2 = firstValueFrom(resolvedDeferredResult2$).then(() => newContext);
    resolveSpy.mockResolvedValueOnce(deferredResult2);
    const promise2 = mocks.profilesManagerMock.resolveRootProfile({
      solutionNavId: 'newSolutionNavId',
    });
    expect(resolveSpy).toHaveReturnedTimes(2);
    expect(resolveSpy).toHaveLastReturnedWith(deferredResult2);
    expect(scopedProfilesManager.getProfiles()).toEqual([{}, {}, {}]);
    resolvedDeferredResult$.next(undefined);
    await promise1;
    expect(scopedProfilesManager.getProfiles()).toEqual([{}, {}, {}]);
    resolvedDeferredResult2$.next(undefined);
    await promise2;
    expect(scopedProfilesManager.getProfiles()).toEqual([
      toAppliedProfile(mocks.rootProfileProviderMock.profile),
      {},
      {},
    ]);
  });

  it('should cancel existing data source profile resolution when another is triggered', async () => {
    const context = await mocks.dataSourceProfileProviderMock.resolve({
      rootContext: { profileId: 'root-profile', solutionType: SolutionType.Default },
      dataSource: createEsqlDataSource(),
      query: { esql: 'from *' },
    });
    const newContext = await mocks.dataSourceProfileProviderMock.resolve({
      rootContext: { profileId: 'other-root-profile', solutionType: SolutionType.Default },
      dataSource: createEsqlDataSource(),
      query: { esql: 'from logs-*' },
    });
    const resolveSpy = jest.spyOn(mocks.dataSourceProfileProviderMock, 'resolve');
    resolveSpy.mockClear();
    const resolvedDeferredResult$ = new Subject();
    const deferredResult = firstValueFrom(resolvedDeferredResult$).then(() => context);
    resolveSpy.mockResolvedValueOnce(deferredResult);
    const scopedProfilesManager = mocks.profilesManagerMock.createScopedProfilesManager({
      scopedEbtManager: mocks.scopedEbtManagerMock,
    });
    const promise1 = scopedProfilesManager.resolveDataSourceProfile({
      dataSource: createEsqlDataSource(),
      query: { esql: 'from *' },
    });
    expect(resolveSpy).toHaveReturnedTimes(1);
    expect(resolveSpy).toHaveLastReturnedWith(deferredResult);
    expect(scopedProfilesManager.getProfiles()).toEqual([{}, {}, {}]);
    const resolvedDeferredResult2$ = new Subject();
    const deferredResult2 = firstValueFrom(resolvedDeferredResult2$).then(() => newContext);
    resolveSpy.mockResolvedValueOnce(deferredResult2);
    const promise2 = scopedProfilesManager.resolveDataSourceProfile({
      dataSource: createEsqlDataSource(),
      query: { esql: 'from logs-*' },
    });
    expect(resolveSpy).toHaveReturnedTimes(2);
    expect(resolveSpy).toHaveLastReturnedWith(deferredResult2);
    expect(scopedProfilesManager.getProfiles()).toEqual([{}, {}, {}]);
    resolvedDeferredResult$.next(undefined);
    await promise1;
    expect(scopedProfilesManager.getProfiles()).toEqual([{}, {}, {}]);
    resolvedDeferredResult2$.next(undefined);
    await promise2;
    expect(scopedProfilesManager.getProfiles()).toEqual([
      {},
      toAppliedProfile(mocks.dataSourceProfileProviderMock.profile),
      {},
    ]);
  });
});
