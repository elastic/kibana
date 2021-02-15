/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { coreMock } from '../../../../../core/public/mocks';
import { Storage } from '../../../../kibana_utils/public';
import { EmbeddableStateTransfer } from '.';
import { ApplicationStart, PublicAppInfo } from '../../../../../core/public';
import { EMBEDDABLE_EDITOR_STATE_KEY, EMBEDDABLE_PACKAGE_STATE_KEY } from './types';
import { EMBEDDABLE_STATE_TRANSFER_STORAGE_KEY } from './embeddable_state_transfer';

const createStorage = (): Storage => {
  const createMockStore = () => {
    let innerStore: Record<string, any> = {};
    return {
      getItem: jest.fn().mockImplementation((key) => innerStore[key]),
      setItem: jest.fn().mockImplementation((key, value) => (innerStore[key] = value)),
      removeItem: jest.fn().mockImplementation((key: string) => delete innerStore[key]),
      clear: jest.fn().mockImplementation(() => (innerStore = {})),
    };
  };
  const store = createMockStore();
  const storage = new Storage(store);
  storage.get = jest.fn().mockImplementation((key) => store.getItem(key));
  storage.set = jest.fn().mockImplementation((key, value) => store.setItem(key, value));
  storage.remove = jest.fn().mockImplementation((key: string) => store.removeItem(key));
  storage.clear = jest.fn().mockImplementation(() => store.clear());
  return storage;
};

describe('embeddable state transfer', () => {
  let application: jest.Mocked<ApplicationStart>;
  let stateTransfer: EmbeddableStateTransfer;
  let store: Storage;

  const destinationApp = 'superUltraVisualize';
  const originatingApp = 'superUltraTestDashboard';

  const testAppId = 'testApp';

  const buildKey = (appId: string, key: string) => `${appId}-${key}`;

  beforeEach(() => {
    const core = coreMock.createStart();
    application = core.application;
    store = createStorage();
    stateTransfer = new EmbeddableStateTransfer(application.navigateToApp, undefined, store);
  });

  it('cannot fetch app name when given no app list', async () => {
    expect(stateTransfer.getAppNameFromId('test')).toBeUndefined();
  });

  it('cannot fetch app name when app id is not in given app list', async () => {
    const appsList = new Map<string, PublicAppInfo>([
      ['testId', { title: 'State Transfer Test App Hello' } as PublicAppInfo],
      ['testId2', { title: 'State Transfer Test App Goodbye' } as PublicAppInfo],
    ]);
    stateTransfer = new EmbeddableStateTransfer(application.navigateToApp, appsList);
    expect(stateTransfer.getAppNameFromId('kibanana')).toBeUndefined();
  });

  it('can fetch app titles when given app list', async () => {
    const appsList = new Map<string, PublicAppInfo>([
      ['testId', { title: 'State Transfer Test App Hello' } as PublicAppInfo],
      ['testId2', { title: 'State Transfer Test App Goodbye' } as PublicAppInfo],
    ]);
    stateTransfer = new EmbeddableStateTransfer(application.navigateToApp, appsList);
    expect(stateTransfer.getAppNameFromId('testId')).toBe('State Transfer Test App Hello');
    expect(stateTransfer.getAppNameFromId('testId2')).toBe('State Transfer Test App Goodbye');
  });

  it('can send an outgoing editor state', async () => {
    await stateTransfer.navigateToEditor(destinationApp, { state: { originatingApp } });
    expect(store.set).toHaveBeenCalledWith(EMBEDDABLE_STATE_TRANSFER_STORAGE_KEY, {
      [buildKey(destinationApp, EMBEDDABLE_EDITOR_STATE_KEY)]: {
        originatingApp: 'superUltraTestDashboard',
      },
    });
    expect(application.navigateToApp).toHaveBeenCalledWith('superUltraVisualize', {
      path: undefined,
    });
  });

  it('can send an outgoing editor state and retain other embeddable state keys', async () => {
    store.set(EMBEDDABLE_STATE_TRANSFER_STORAGE_KEY, {
      kibanaIsNowForSports: 'extremeSportsKibana',
    });
    await stateTransfer.navigateToEditor(destinationApp, {
      state: { originatingApp },
    });
    expect(store.set).toHaveBeenCalledWith(EMBEDDABLE_STATE_TRANSFER_STORAGE_KEY, {
      kibanaIsNowForSports: 'extremeSportsKibana',
      [buildKey(destinationApp, EMBEDDABLE_EDITOR_STATE_KEY)]: {
        originatingApp: 'superUltraTestDashboard',
      },
    });
    expect(application.navigateToApp).toHaveBeenCalledWith('superUltraVisualize', {
      path: undefined,
    });
  });

  it('can send an outgoing embeddable package state', async () => {
    await stateTransfer.navigateToWithEmbeddablePackage(destinationApp, {
      state: { type: 'coolestType', input: { savedObjectId: '150' } },
    });
    expect(store.set).toHaveBeenCalledWith(EMBEDDABLE_STATE_TRANSFER_STORAGE_KEY, {
      [buildKey(destinationApp, EMBEDDABLE_PACKAGE_STATE_KEY)]: {
        type: 'coolestType',
        input: { savedObjectId: '150' },
      },
    });
    expect(application.navigateToApp).toHaveBeenCalledWith('superUltraVisualize', {
      path: undefined,
    });
  });

  it('can send an outgoing embeddable and retain other embeddable state keys', async () => {
    store.set(EMBEDDABLE_STATE_TRANSFER_STORAGE_KEY, {
      kibanaIsNowForSports: 'extremeSportsKibana',
    });
    await stateTransfer.navigateToWithEmbeddablePackage(destinationApp, {
      state: { type: 'coolestType', input: { savedObjectId: '150' } },
    });
    expect(store.set).toHaveBeenCalledWith(EMBEDDABLE_STATE_TRANSFER_STORAGE_KEY, {
      kibanaIsNowForSports: 'extremeSportsKibana',
      [buildKey(destinationApp, EMBEDDABLE_PACKAGE_STATE_KEY)]: {
        type: 'coolestType',
        input: { savedObjectId: '150' },
      },
    });
    expect(application.navigateToApp).toHaveBeenCalledWith('superUltraVisualize', {
      path: undefined,
    });
  });

  it('can fetch an incoming editor state', async () => {
    store.set(EMBEDDABLE_STATE_TRANSFER_STORAGE_KEY, {
      [buildKey(testAppId, EMBEDDABLE_EDITOR_STATE_KEY)]: {
        originatingApp: 'superUltraTestDashboard',
      },
    });
    const fetchedState = stateTransfer.getIncomingEditorState(testAppId);
    expect(fetchedState).toEqual({ originatingApp: 'superUltraTestDashboard' });
  });

  it('can fetch an incoming editor state and ignore state for other apps', async () => {
    store.set(EMBEDDABLE_STATE_TRANSFER_STORAGE_KEY, {
      [buildKey('otherApp1', EMBEDDABLE_EDITOR_STATE_KEY)]: {
        originatingApp: 'whoops not me',
      },
      [buildKey('otherApp2', EMBEDDABLE_EDITOR_STATE_KEY)]: {
        originatingApp: 'otherTestDashboard',
      },
      [buildKey(testAppId, EMBEDDABLE_EDITOR_STATE_KEY)]: {
        originatingApp: 'superUltraTestDashboard',
      },
    });
    const fetchedState = stateTransfer.getIncomingEditorState(testAppId);
    expect(fetchedState).toEqual({ originatingApp: 'superUltraTestDashboard' });

    const fetchedState2 = stateTransfer.getIncomingEditorState('otherApp2');
    expect(fetchedState2).toEqual({ originatingApp: 'otherTestDashboard' });
  });

  it('incoming editor state returns undefined when state is not in the right shape', async () => {
    store.set(EMBEDDABLE_STATE_TRANSFER_STORAGE_KEY, {
      [buildKey(testAppId, EMBEDDABLE_EDITOR_STATE_KEY)]: {
        helloSportsKibana: 'superUltraTestDashboard',
      },
    });
    const fetchedState = stateTransfer.getIncomingEditorState(testAppId);
    expect(fetchedState).toBeUndefined();
  });

  it('can fetch an incoming embeddable package state', async () => {
    store.set(EMBEDDABLE_STATE_TRANSFER_STORAGE_KEY, {
      [buildKey(testAppId, EMBEDDABLE_PACKAGE_STATE_KEY)]: {
        type: 'skisEmbeddable',
        input: { savedObjectId: '123' },
      },
    });
    const fetchedState = stateTransfer.getIncomingEmbeddablePackage(testAppId);
    expect(fetchedState).toEqual({ type: 'skisEmbeddable', input: { savedObjectId: '123' } });
  });

  it('can fetch an incoming embeddable package state and ignore state for other apps', async () => {
    store.set(EMBEDDABLE_STATE_TRANSFER_STORAGE_KEY, {
      [buildKey(testAppId, EMBEDDABLE_PACKAGE_STATE_KEY)]: {
        type: 'skisEmbeddable',
        input: { savedObjectId: '123' },
      },
      [buildKey('testApp2', EMBEDDABLE_PACKAGE_STATE_KEY)]: {
        type: 'crossCountryEmbeddable',
        input: { savedObjectId: '456' },
      },
    });
    const fetchedState = stateTransfer.getIncomingEmbeddablePackage(testAppId);
    expect(fetchedState).toEqual({ type: 'skisEmbeddable', input: { savedObjectId: '123' } });

    const fetchedState2 = stateTransfer.getIncomingEmbeddablePackage('testApp2');
    expect(fetchedState2).toEqual({
      type: 'crossCountryEmbeddable',
      input: { savedObjectId: '456' },
    });
  });

  it('embeddable package state returns undefined when state is not in the right shape', async () => {
    store.set(EMBEDDABLE_STATE_TRANSFER_STORAGE_KEY, {
      [buildKey(testAppId, EMBEDDABLE_PACKAGE_STATE_KEY)]: { kibanaIsFor: 'sports' },
    });
    const fetchedState = stateTransfer.getIncomingEmbeddablePackage(testAppId);
    expect(fetchedState).toBeUndefined();
  });

  it('removes embeddable package key when removeAfterFetch is true', async () => {
    store.set(EMBEDDABLE_STATE_TRANSFER_STORAGE_KEY, {
      [buildKey(testAppId, EMBEDDABLE_PACKAGE_STATE_KEY)]: {
        type: 'coolestType',
        input: { savedObjectId: '150' },
      },
      iSHouldStillbeHere: 'doing the sports thing',
    });
    stateTransfer.getIncomingEmbeddablePackage(testAppId, true);
    expect(store.get(EMBEDDABLE_STATE_TRANSFER_STORAGE_KEY)).toEqual({
      iSHouldStillbeHere: 'doing the sports thing',
    });
  });

  it('removes editor state key when removeAfterFetch is true', async () => {
    store.set(EMBEDDABLE_STATE_TRANSFER_STORAGE_KEY, {
      [buildKey(testAppId, EMBEDDABLE_EDITOR_STATE_KEY)]: {
        originatingApp: 'superCoolFootballDashboard',
      },
      iSHouldStillbeHere: 'doing the sports thing',
    });
    stateTransfer.getIncomingEditorState(testAppId, true);
    expect(store.get(EMBEDDABLE_STATE_TRANSFER_STORAGE_KEY)).toEqual({
      iSHouldStillbeHere: 'doing the sports thing',
    });
  });
});
