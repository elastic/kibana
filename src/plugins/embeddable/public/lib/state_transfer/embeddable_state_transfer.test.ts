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

import { coreMock } from '../../../../../core/public/mocks';
import { EmbeddableStateTransfer } from '.';
import { ApplicationStart, ScopedHistory } from '../../../../../core/public';

interface SuperCoolCustomState {
  isCool: boolean;
  coolValue: number;
}

function isSuperCoolState(state: unknown): state is SuperCoolCustomState {
  return (
    state &&
    'isCool' in (state as { [key: string]: unknown }) &&
    typeof (state as { [key: string]: unknown }).isCool === 'boolean' &&
    'coolValue' in (state as { [key: string]: unknown }) &&
    typeof (state as { [key: string]: unknown }).coolValue === 'number'
  );
}

function mockHistoryState(state: unknown) {
  return {
    location: {
      state,
    },
  } as ScopedHistory;
}

describe('embeddable state transfer', () => {
  let application: jest.Mocked<ApplicationStart>;
  let stateTransfer: EmbeddableStateTransfer;
  const destinationApp = 'superUltraVisualize';
  const originatingApp = 'superUltraTestDashboard';

  beforeEach(() => {
    const core = coreMock.createStart();
    application = core.application;
    stateTransfer = new EmbeddableStateTransfer(core);
  });

  it('can send an outgoing originating app state', async () => {
    await stateTransfer.outgoingOriginatingApp(destinationApp, { state: { originatingApp } });
    expect(application.navigateToApp).toHaveBeenCalledWith('superUltraVisualize', {
      state: { originatingApp: 'superUltraTestDashboard' },
    });
  });

  it('can send an outgoing embeddable package state', async () => {
    await stateTransfer.outgoingEmbeddablePackage(destinationApp, {
      state: { type: 'coolestType', id: '150' },
    });
    expect(application.navigateToApp).toHaveBeenCalledWith('superUltraVisualize', {
      state: { type: 'coolestType', id: '150' },
    });
  });

  it('can send an outgoing custom state', () => {
    stateTransfer.outgoing<SuperCoolCustomState>(destinationApp, {
      state: { isCool: false, coolValue: 0 },
    });
    expect(application.navigateToApp).toHaveBeenCalledWith('superUltraVisualize', {
      state: { isCool: false, coolValue: 0 },
    });
  });

  it('can fetch an incoming originating app state', async () => {
    const historyMock = mockHistoryState({ originatingApp: 'extremeSportsKibana' });
    const fetchedState = stateTransfer.incomingOriginatingApp(historyMock as ScopedHistory);
    expect(fetchedState).toEqual({ originatingApp: 'extremeSportsKibana' });
  });

  it('returns undefined with originating app state is not in the right shape', async () => {
    const historyMock = mockHistoryState({ kibanaIsNowForSports: 'extremeSportsKibana' });
    const fetchedState = stateTransfer.incomingOriginatingApp(historyMock as ScopedHistory);
    expect(fetchedState).toBeUndefined();
  });

  it('can fetch an incoming embeddable package state', async () => {
    const historyMock = mockHistoryState({ type: 'skisEmbeddable', id: '123' });
    const fetchedState = stateTransfer.incomingEmbeddablePackage(historyMock as ScopedHistory);
    expect(fetchedState).toEqual({ type: 'skisEmbeddable', id: '123' });
  });

  it('returns undefined when embeddable package is not in the right shape', async () => {
    const historyMock = mockHistoryState({ kibanaIsNowForSports: 'extremeSportsKibana' });
    const fetchedState = stateTransfer.incomingEmbeddablePackage(historyMock as ScopedHistory);
    expect(fetchedState).toBeUndefined();
  });

  it('can fetch a custom state', async () => {
    const historyMock = mockHistoryState({ isCool: true, coolValue: 123 });
    const fetchedState = stateTransfer.incoming<SuperCoolCustomState>(
      historyMock as ScopedHistory,
      isSuperCoolState
    );
    expect(fetchedState).toEqual({ isCool: true, coolValue: 123 });
  });

  it('incoming embeddable package fetches undefined when not given state in the right shape', async () => {
    const historyMock = mockHistoryState({ isUncool: false, coolValue: 123 });
    const fetchedState = stateTransfer.incoming<SuperCoolCustomState>(
      historyMock as ScopedHistory,
      isSuperCoolState
    );
    expect(fetchedState).toBeUndefined();
  });

  it('removes state after fetching if removeAfterFetching is true', async () => {
    const historyMock = mockHistoryState({ isCool: false, coolValue: 123 });
    stateTransfer.incoming<SuperCoolCustomState>(
      historyMock as ScopedHistory,
      isSuperCoolState,
      true
    );
    expect((historyMock.location.state as { [key: string]: unknown }).isCool).toBeUndefined();
    expect((historyMock.location.state as { [key: string]: unknown }).coolValue).toBeUndefined();
  });

  it('leaves state as is if removeAfterFetching is false', async () => {
    const historyMock = mockHistoryState({ isCool: false, coolValue: 123 });
    stateTransfer.incoming<SuperCoolCustomState>(historyMock as ScopedHistory, isSuperCoolState);
    expect((historyMock.location.state as { [key: string]: unknown }).isCool).toBeDefined();
    expect((historyMock.location.state as { [key: string]: unknown }).coolValue).toBeDefined();
  });
});
