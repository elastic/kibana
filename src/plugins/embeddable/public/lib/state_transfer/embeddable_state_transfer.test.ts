/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { coreMock, scopedHistoryMock } from '../../../../../core/public/mocks';
import { EmbeddableStateTransfer } from '.';
import { ApplicationStart, PublicAppInfo } from '../../../../../core/public';

function mockHistoryState(state: unknown) {
  return scopedHistoryMock.create({ state });
}

describe('embeddable state transfer', () => {
  let application: jest.Mocked<ApplicationStart>;
  let stateTransfer: EmbeddableStateTransfer;
  const destinationApp = 'superUltraVisualize';
  const originatingApp = 'superUltraTestDashboard';

  beforeEach(() => {
    const core = coreMock.createStart();
    application = core.application;
    stateTransfer = new EmbeddableStateTransfer(application.navigateToApp);
  });

  it('cannot fetch app name when given no app list', async () => {
    expect(stateTransfer.getAppNameFromId('test')).toBeUndefined();
  });

  it('cannot fetch app name when app id is not in given app list', async () => {
    const appsList = new Map<string, PublicAppInfo>([
      ['testId', { title: 'State Transfer Test App Hello' } as PublicAppInfo],
      ['testId2', { title: 'State Transfer Test App Goodbye' } as PublicAppInfo],
    ]);
    stateTransfer = new EmbeddableStateTransfer(application.navigateToApp, undefined, appsList);
    expect(stateTransfer.getAppNameFromId('kibanana')).toBeUndefined();
  });

  it('can fetch app titles when given app list', async () => {
    const appsList = new Map<string, PublicAppInfo>([
      ['testId', { title: 'State Transfer Test App Hello' } as PublicAppInfo],
      ['testId2', { title: 'State Transfer Test App Goodbye' } as PublicAppInfo],
    ]);
    stateTransfer = new EmbeddableStateTransfer(application.navigateToApp, undefined, appsList);
    expect(stateTransfer.getAppNameFromId('testId')).toBe('State Transfer Test App Hello');
    expect(stateTransfer.getAppNameFromId('testId2')).toBe('State Transfer Test App Goodbye');
  });

  it('can send an outgoing originating app state', async () => {
    await stateTransfer.navigateToEditor(destinationApp, { state: { originatingApp } });
    expect(application.navigateToApp).toHaveBeenCalledWith('superUltraVisualize', {
      state: { originatingApp: 'superUltraTestDashboard' },
    });
  });

  it('can send an outgoing originating app state in append mode', async () => {
    const historyMock = mockHistoryState({ kibanaIsNowForSports: 'extremeSportsKibana' });
    stateTransfer = new EmbeddableStateTransfer(application.navigateToApp, historyMock);
    await stateTransfer.navigateToEditor(destinationApp, {
      state: { originatingApp },
      appendToExistingState: true,
    });
    expect(application.navigateToApp).toHaveBeenCalledWith('superUltraVisualize', {
      path: undefined,
      state: {
        kibanaIsNowForSports: 'extremeSportsKibana',
        originatingApp: 'superUltraTestDashboard',
      },
    });
  });

  it('can send an outgoing embeddable package state', async () => {
    await stateTransfer.navigateToWithEmbeddablePackage(destinationApp, {
      state: { type: 'coolestType', id: '150' },
    });
    expect(application.navigateToApp).toHaveBeenCalledWith('superUltraVisualize', {
      state: { type: 'coolestType', id: '150' },
    });
  });

  it('can send an outgoing embeddable package state in append mode', async () => {
    const historyMock = mockHistoryState({ kibanaIsNowForSports: 'extremeSportsKibana' });
    stateTransfer = new EmbeddableStateTransfer(application.navigateToApp, historyMock);
    await stateTransfer.navigateToWithEmbeddablePackage(destinationApp, {
      state: { type: 'coolestType', id: '150' },
      appendToExistingState: true,
    });
    expect(application.navigateToApp).toHaveBeenCalledWith('superUltraVisualize', {
      path: undefined,
      state: { kibanaIsNowForSports: 'extremeSportsKibana', type: 'coolestType', id: '150' },
    });
  });

  it('can fetch an incoming originating app state', async () => {
    const historyMock = mockHistoryState({ originatingApp: 'extremeSportsKibana' });
    stateTransfer = new EmbeddableStateTransfer(application.navigateToApp, historyMock);
    const fetchedState = stateTransfer.getIncomingEditorState();
    expect(fetchedState).toEqual({ originatingApp: 'extremeSportsKibana' });
  });

  it('returns undefined with originating app state is not in the right shape', async () => {
    const historyMock = mockHistoryState({ kibanaIsNowForSports: 'extremeSportsKibana' });
    stateTransfer = new EmbeddableStateTransfer(application.navigateToApp, historyMock);
    const fetchedState = stateTransfer.getIncomingEditorState();
    expect(fetchedState).toBeUndefined();
  });

  it('can fetch an incoming embeddable package state', async () => {
    const historyMock = mockHistoryState({ type: 'skisEmbeddable', id: '123' });
    stateTransfer = new EmbeddableStateTransfer(application.navigateToApp, historyMock);
    const fetchedState = stateTransfer.getIncomingEmbeddablePackage();
    expect(fetchedState).toEqual({ type: 'skisEmbeddable', id: '123' });
  });

  it('returns undefined when embeddable package is not in the right shape', async () => {
    const historyMock = mockHistoryState({ kibanaIsNowForSports: 'extremeSportsKibana' });
    stateTransfer = new EmbeddableStateTransfer(application.navigateToApp, historyMock);
    const fetchedState = stateTransfer.getIncomingEmbeddablePackage();
    expect(fetchedState).toBeUndefined();
  });

  it('removes all keys in the keysToRemoveAfterFetch array', async () => {
    const historyMock = mockHistoryState({
      type: 'skisEmbeddable',
      id: '123',
      test1: 'test1',
      test2: 'test2',
    });
    stateTransfer = new EmbeddableStateTransfer(application.navigateToApp, historyMock);
    stateTransfer.getIncomingEmbeddablePackage({ keysToRemoveAfterFetch: ['type', 'id'] });
    expect(historyMock.replace).toHaveBeenCalledWith(
      expect.objectContaining({ state: { test1: 'test1', test2: 'test2' } })
    );
  });

  it('leaves state as is when no keysToRemove are supplied', async () => {
    const historyMock = mockHistoryState({
      type: 'skisEmbeddable',
      id: '123',
      test1: 'test1',
      test2: 'test2',
    });
    stateTransfer = new EmbeddableStateTransfer(application.navigateToApp, historyMock);
    stateTransfer.getIncomingEmbeddablePackage();
    expect(historyMock.location.state).toEqual({
      type: 'skisEmbeddable',
      id: '123',
      test1: 'test1',
      test2: 'test2',
    });
  });
});
