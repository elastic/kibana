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

import { createStateContainer } from '../state_containers';
import {
  defaultState,
  pureTransitions,
  TodoActions,
  TodoState,
} from '../../demos/state_containers/todomvc';
import { syncState } from './state_sync';
import { ISyncStrategy } from './state_sync_strategies/types';
import { Observable, Subject } from 'rxjs';
import {
  createSessionStorageSyncStrategy,
  createKbnUrlSyncStrategy,
} from './state_sync_strategies';
import { StubBrowserStorage } from 'test_utils/stub_browser_storage';
import { createBrowserHistory, History } from 'history';

const tick = () => new Promise(resolve => setTimeout(resolve));

describe('state_sync', () => {
  describe('basic', () => {
    const container = createStateContainer<TodoState, TodoActions>(defaultState, pureTransitions);
    beforeEach(() => {
      container.set(defaultState);
    });
    const storageChange$ = new Subject<TodoState | null>();
    let testSyncStrategy: ISyncStrategy;

    beforeEach(() => {
      testSyncStrategy = {
        toStorage: jest.fn(),
        fromStorage: jest.fn(),
        storageChange$: <State>(key: string) =>
          storageChange$.asObservable() as Observable<State | null>,
      };
    });

    it('should sync state to storage', async () => {
      const key = '_s';
      const [start, stop] = syncState({
        stateContainer: container,
        syncKey: key,
        syncStrategy: testSyncStrategy,
      });
      await start();

      // initial sync of state to storage
      expect(testSyncStrategy.toStorage).toBeCalledWith(key, defaultState, { replace: true });

      container.transitions.add({
        id: 1,
        text: 'Learning transitions...',
        completed: false,
      });
      await tick();
      expect(testSyncStrategy.toStorage).toBeCalledWith(key, container.getState(), {
        replace: false,
      });

      stop();
    });

    it('should sync storage to state', async () => {
      const key = '_s';
      const storageState1 = [{ id: 1, text: 'todo', completed: false }];
      (testSyncStrategy.fromStorage as jest.Mock).mockImplementation(() => storageState1);
      const [start, stop] = syncState({
        stateContainer: container,
        syncKey: key,
        syncStrategy: testSyncStrategy,
      });
      await start();

      // initial sync of storage to state
      expect(container.getState()).toEqual(storageState1);

      const storageState2 = [{ id: 1, text: 'todo', completed: true }];
      (testSyncStrategy.fromStorage as jest.Mock).mockImplementation(() => storageState2);
      storageChange$.next(storageState2);

      await tick();
      expect(container.getState()).toEqual(storageState2);

      stop();
    });

    it('should not update storage if no actual state change happened', async () => {
      const key = '_s';
      const [start, stop] = syncState({
        stateContainer: container,
        syncKey: key,
        syncStrategy: testSyncStrategy,
      });
      await start();
      (testSyncStrategy.toStorage as jest.Mock).mockClear();

      container.set(defaultState);
      await tick();
      expect(testSyncStrategy.toStorage).not.toBeCalled();

      stop();
    });

    it('should not update state container if no actual storage change happened', async () => {
      const key = '_s';
      const [start, stop] = syncState({
        stateContainer: container,
        syncKey: key,
        syncStrategy: testSyncStrategy,
      });
      await start();

      const originalState = container.getState();
      const storageState = [...originalState];
      (testSyncStrategy.fromStorage as jest.Mock).mockImplementation(() => storageState);
      storageChange$.next(storageState);
      await tick();

      expect(container.getState()).toBe(originalState);

      stop();
    });
  });

  describe('integration', () => {
    const key1 = '_s1';
    const container1 = createStateContainer<TodoState, TodoActions>(defaultState, pureTransitions);
    const key2 = '_s2';
    const container2 = createStateContainer<TodoState, TodoActions>(defaultState, pureTransitions);

    let sessionStorage: StubBrowserStorage;
    let sessionStorageSyncStrategy: ISyncStrategy;
    let history: History;
    const getCurrentUrl = () => history.createHref(history.location);
    let urlSyncStrategy: ISyncStrategy;

    beforeEach(() => {
      container1.set(defaultState);
      container2.set(defaultState);

      window.location.href = '/';
      sessionStorage = new StubBrowserStorage();
      sessionStorageSyncStrategy = createSessionStorageSyncStrategy(sessionStorage);
      history = createBrowserHistory();
      (history as any).anton = 'ha';
      urlSyncStrategy = createKbnUrlSyncStrategy({ useHash: false, history });
    });

    it('should sync state containers and storages to proper initial state', async () => {
      const sessionStorageState1 = [{ id: 1, text: 'todo1', completed: false }];
      const sessionStorageState2 = [{ id: 2, text: 'todo2', completed: true }];
      sessionStorage.setItem(key1, JSON.stringify(sessionStorageState1));
      sessionStorage.setItem(key2, JSON.stringify(sessionStorageState2));
      // @ts-ignore
      const urlStorageState1 = [{ id: 3, text: 'todo3', completed: false }];
      const urlStorageState2 = [{ id: 4, text: 'todo4', completed: true }];
      history.replace(
        '/#?_s1=!((completed:!f,id:3,text:todo3))&_s2=!((completed:!t,id:4,text:todo4))'
      );

      const [start, stop] = syncState([
        {
          stateContainer: container1,
          syncKey: key1,
          syncStrategy: urlSyncStrategy,
        },
        {
          stateContainer: container1,
          syncKey: key1,
          syncStrategy: sessionStorageSyncStrategy,
        },
        {
          stateContainer: container2,
          syncKey: key2,
          syncStrategy: sessionStorageSyncStrategy,
        },
        {
          stateContainer: container2,
          syncKey: key2,
          syncStrategy: urlSyncStrategy,
        },
      ]);
      await start();

      expect(container1.getState()).toEqual(sessionStorageState1); // because sessionStorageState1 comes after urlStorageState1
      expect(container2.getState()).toEqual(urlStorageState2); // because urlStorageState2 comes after sessionStorageState2

      expect(JSON.parse(sessionStorage.getItem(key2)!)).toEqual(urlStorageState2);
      expect(getCurrentUrl()).toMatchInlineSnapshot(
        `"/#?_s1=!((completed:!f,id:1,text:todo1))&_s2=!((completed:!t,id:4,text:todo4))"`
      );

      stop();
    });

    it('change to one storage should also update other storage', async () => {
      const [start, stop] = syncState([
        {
          stateContainer: container1,
          syncKey: key1,
          syncStrategy: urlSyncStrategy,
        },
        {
          stateContainer: container1,
          syncKey: key1,
          syncStrategy: sessionStorageSyncStrategy,
        },
      ]);
      await start();

      const newStateFromUrl = [{ completed: false, id: 1, text: 'changed' }];
      history.replace('/#?_s1=!((completed:!f,id:1,text:changed))');

      await tick();

      expect(container1.getState()).toEqual(newStateFromUrl);
      expect(JSON.parse(sessionStorage.getItem(key1)!)).toEqual(newStateFromUrl);

      stop();
    });
  });
});
