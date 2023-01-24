/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createKbnUrlStateStorage, withNotifyOnErrors } from '@kbn/kibana-utils-plugin/public';
import { History } from 'history';

import { savedSearchMock } from '../../../__mocks__/saved_search';
import { discoverServiceMock } from '../../../__mocks__/services';
import {
  DiscoverAppStateContainer,
  getDiscoverAppStateContainer,
} from './discover_app_state_container';

let history: History;
let state: DiscoverAppStateContainer;

describe('Test discover app state container', () => {
  beforeEach(async () => {
    const storeInSessionStorage = discoverServiceMock.uiSettings.get('state:storeInSessionStorage');
    const toasts = discoverServiceMock.core.notifications.toasts;
    const stateStorage = createKbnUrlStateStorage({
      useHash: storeInSessionStorage,
      history,
      ...(toasts && withNotifyOnErrors(toasts)),
    });
    state = getDiscoverAppStateContainer(stateStorage, savedSearchMock, discoverServiceMock);
  });

  test('hasChanged returns whether the current state has changed', async () => {
    state.set({ index: 'modified' });
    expect(state.hasChanged()).toBeTruthy();
    state.resetInitialState();
    expect(state.hasChanged()).toBeFalsy();
  });

  test('getPrevious returns the state before the current', async () => {
    state.set({ index: 'first' });
    const stateA = state.getState();
    state.set({ index: 'second' });
    expect(state.getPrevious()).toEqual(stateA);
  });
});
