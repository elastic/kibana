/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { firstValueFrom, Subject } from 'rxjs';
import { createEsqlDataSource } from '../../common/data_sources';
import { addLog } from '../utils/add_log';
import { createContextAwarenessMocks } from './__mocks__';

jest.mock('../utils/add_log');

let mocks = createContextAwarenessMocks();

describe('ProfilesManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocks = createContextAwarenessMocks();
  });

  it('should return default profiles', () => {
    const profiles = mocks.profilesManagerMock.getProfiles();
    expect(profiles).toEqual([{}, {}, {}]);
  });

  it('should resolve root profile', async () => {
    await mocks.profilesManagerMock.resolveRootProfile({});
    const profiles = mocks.profilesManagerMock.getProfiles();
    expect(profiles).toEqual([mocks.rootProfileProviderMock.profile, {}, {}]);
  });

  it('should resolve data source profile', async () => {
    await mocks.profilesManagerMock.resolveDataSourceProfile({});
    const profiles = mocks.profilesManagerMock.getProfiles();
    expect(profiles).toEqual([{}, mocks.dataSourceProfileProviderMock.profile, {}]);
  });

  it('should resolve document profile', async () => {
    const record = mocks.profilesManagerMock.resolveDocumentProfile({
      record: mocks.contextRecordMock,
    });
    const profiles = mocks.profilesManagerMock.getProfiles({ record });
    expect(profiles).toEqual([{}, {}, mocks.documentProfileProviderMock.profile]);
  });

  it('should resolve multiple profiles', async () => {
    await mocks.profilesManagerMock.resolveRootProfile({});
    await mocks.profilesManagerMock.resolveDataSourceProfile({});
    const record = mocks.profilesManagerMock.resolveDocumentProfile({
      record: mocks.contextRecordMock,
    });
    const profiles = mocks.profilesManagerMock.getProfiles({ record });
    expect(profiles).toEqual([
      mocks.rootProfileProviderMock.profile,
      mocks.dataSourceProfileProviderMock.profile,
      mocks.documentProfileProviderMock.profile,
    ]);
  });

  it('should expose profiles as an observable', async () => {
    const getProfilesSpy = jest.spyOn(mocks.profilesManagerMock, 'getProfiles');
    const record = mocks.profilesManagerMock.resolveDocumentProfile({
      record: mocks.contextRecordMock,
    });
    const profiles$ = mocks.profilesManagerMock.getProfiles$({ record });
    const next = jest.fn();
    profiles$.subscribe(next);
    expect(getProfilesSpy).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith([{}, {}, mocks.documentProfileProviderMock.profile]);
    await mocks.profilesManagerMock.resolveRootProfile({});
    expect(getProfilesSpy).toHaveBeenCalledTimes(2);
    expect(next).toHaveBeenCalledWith([
      mocks.rootProfileProviderMock.profile,
      {},
      mocks.documentProfileProviderMock.profile,
    ]);
    await mocks.profilesManagerMock.resolveDataSourceProfile({});
    expect(getProfilesSpy).toHaveBeenCalledTimes(3);
    expect(next).toHaveBeenCalledWith([
      mocks.rootProfileProviderMock.profile,
      mocks.dataSourceProfileProviderMock.profile,
      mocks.documentProfileProviderMock.profile,
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
    await mocks.profilesManagerMock.resolveDataSourceProfile({
      dataSource: createEsqlDataSource(),
      query: { esql: 'from *' },
    });
    expect(mocks.dataSourceProfileProviderMock.resolve).toHaveBeenCalledTimes(1);
    await mocks.profilesManagerMock.resolveDataSourceProfile({
      dataSource: createEsqlDataSource(),
      query: { esql: 'from *' },
    });
    expect(mocks.dataSourceProfileProviderMock.resolve).toHaveBeenCalledTimes(1);
  });

  it('should resolve data source profile again if params have changed', async () => {
    await mocks.profilesManagerMock.resolveDataSourceProfile({
      dataSource: createEsqlDataSource(),
      query: { esql: 'from *' },
    });
    expect(mocks.dataSourceProfileProviderMock.resolve).toHaveBeenCalledTimes(1);
    await mocks.profilesManagerMock.resolveDataSourceProfile({
      dataSource: createEsqlDataSource(),
      query: { esql: 'from logs-*' },
    });
    expect(mocks.dataSourceProfileProviderMock.resolve).toHaveBeenCalledTimes(2);
  });

  it('should log an error and fall back to the default profile if root profile resolution fails', async () => {
    await mocks.profilesManagerMock.resolveRootProfile({ solutionNavId: 'solutionNavId' });
    let profiles = mocks.profilesManagerMock.getProfiles();
    expect(profiles).toEqual([mocks.rootProfileProviderMock.profile, {}, {}]);
    const resolveSpy = jest.spyOn(mocks.rootProfileProviderMock, 'resolve');
    resolveSpy.mockRejectedValue(new Error('Failed to resolve'));
    await mocks.profilesManagerMock.resolveRootProfile({ solutionNavId: 'newSolutionNavId' });
    expect(addLog).toHaveBeenCalledWith(
      '[ProfilesManager] root context resolution failed with params: {\n  "solutionNavId": "newSolutionNavId"\n}',
      new Error('Failed to resolve')
    );
    profiles = mocks.profilesManagerMock.getProfiles();
    expect(profiles).toEqual([{}, {}, {}]);
  });

  it('should log an error and fall back to the default profile if data source profile resolution fails', async () => {
    await mocks.profilesManagerMock.resolveDataSourceProfile({
      dataSource: createEsqlDataSource(),
      query: { esql: 'from *' },
    });
    let profiles = mocks.profilesManagerMock.getProfiles();
    expect(profiles).toEqual([{}, mocks.dataSourceProfileProviderMock.profile, {}]);
    const resolveSpy = jest.spyOn(mocks.dataSourceProfileProviderMock, 'resolve');
    resolveSpy.mockRejectedValue(new Error('Failed to resolve'));
    await mocks.profilesManagerMock.resolveDataSourceProfile({
      dataSource: createEsqlDataSource(),
      query: { esql: 'from logs-*' },
    });
    expect(addLog).toHaveBeenCalledWith(
      '[ProfilesManager] data source context resolution failed with params: {\n  "esqlQuery": "from logs-*"\n}',
      new Error('Failed to resolve')
    );
    profiles = mocks.profilesManagerMock.getProfiles();
    expect(profiles).toEqual([{}, {}, {}]);
  });

  it('should log an error and fall back to the default profile if document profile resolution fails', () => {
    const record = mocks.profilesManagerMock.resolveDocumentProfile({
      record: mocks.contextRecordMock,
    });
    let profiles = mocks.profilesManagerMock.getProfiles({ record });
    expect(profiles).toEqual([{}, {}, mocks.documentProfileProviderMock.profile]);
    const resolveSpy = jest.spyOn(mocks.documentProfileProviderMock, 'resolve');
    resolveSpy.mockImplementation(() => {
      throw new Error('Failed to resolve');
    });
    const record2 = mocks.profilesManagerMock.resolveDocumentProfile({
      record: mocks.contextRecordMock2,
    });
    profiles = mocks.profilesManagerMock.getProfiles({ record: record2 });
    expect(addLog).toHaveBeenCalledWith(
      '[ProfilesManager] document context resolution failed with params: {\n  "recordId": "logstash-2014.09.09::388::"\n}',
      new Error('Failed to resolve')
    );
    expect(profiles).toEqual([{}, {}, {}]);
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
    expect(mocks.profilesManagerMock.getProfiles()).toEqual([{}, {}, {}]);
    const resolvedDeferredResult2$ = new Subject();
    const deferredResult2 = firstValueFrom(resolvedDeferredResult2$).then(() => newContext);
    resolveSpy.mockResolvedValueOnce(deferredResult2);
    const promise2 = mocks.profilesManagerMock.resolveRootProfile({
      solutionNavId: 'newSolutionNavId',
    });
    expect(resolveSpy).toHaveReturnedTimes(2);
    expect(resolveSpy).toHaveLastReturnedWith(deferredResult2);
    expect(mocks.profilesManagerMock.getProfiles()).toEqual([{}, {}, {}]);
    resolvedDeferredResult$.next(undefined);
    await promise1;
    expect(mocks.profilesManagerMock.getProfiles()).toEqual([{}, {}, {}]);
    resolvedDeferredResult2$.next(undefined);
    await promise2;
    expect(mocks.profilesManagerMock.getProfiles()).toEqual([
      mocks.rootProfileProviderMock.profile,
      {},
      {},
    ]);
  });

  it('should cancel existing data source profile resolution when another is triggered', async () => {
    const context = await mocks.dataSourceProfileProviderMock.resolve({
      dataSource: createEsqlDataSource(),
      query: { esql: 'from *' },
    });
    const newContext = await mocks.dataSourceProfileProviderMock.resolve({
      dataSource: createEsqlDataSource(),
      query: { esql: 'from logs-*' },
    });
    const resolveSpy = jest.spyOn(mocks.dataSourceProfileProviderMock, 'resolve');
    resolveSpy.mockClear();
    const resolvedDeferredResult$ = new Subject();
    const deferredResult = firstValueFrom(resolvedDeferredResult$).then(() => context);
    resolveSpy.mockResolvedValueOnce(deferredResult);
    const promise1 = mocks.profilesManagerMock.resolveDataSourceProfile({
      dataSource: createEsqlDataSource(),
      query: { esql: 'from *' },
    });
    expect(resolveSpy).toHaveReturnedTimes(1);
    expect(resolveSpy).toHaveLastReturnedWith(deferredResult);
    expect(mocks.profilesManagerMock.getProfiles()).toEqual([{}, {}, {}]);
    const resolvedDeferredResult2$ = new Subject();
    const deferredResult2 = firstValueFrom(resolvedDeferredResult2$).then(() => newContext);
    resolveSpy.mockResolvedValueOnce(deferredResult2);
    const promise2 = mocks.profilesManagerMock.resolveDataSourceProfile({
      dataSource: createEsqlDataSource(),
      query: { esql: 'from logs-*' },
    });
    expect(resolveSpy).toHaveReturnedTimes(2);
    expect(resolveSpy).toHaveLastReturnedWith(deferredResult2);
    expect(mocks.profilesManagerMock.getProfiles()).toEqual([{}, {}, {}]);
    resolvedDeferredResult$.next(undefined);
    await promise1;
    expect(mocks.profilesManagerMock.getProfiles()).toEqual([{}, {}, {}]);
    resolvedDeferredResult2$.next(undefined);
    await promise2;
    expect(mocks.profilesManagerMock.getProfiles()).toEqual([
      {},
      mocks.dataSourceProfileProviderMock.profile,
      {},
    ]);
  });
});
