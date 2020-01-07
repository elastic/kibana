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

import { BaseStateContainer, createStateContainer } from '../state_containers';
import {
  defaultState,
  pureTransitions,
  TodoActions,
  TodoState,
} from '../../demos/state_containers/todomvc';
import { syncState, syncStates } from './state_sync';
import { ISyncStrategy } from './state_sync_strategies/types';
import { Observable, Subject } from 'rxjs';
import {
  createSessionStorageSyncStrategy,
  createKbnUrlSyncStrategy,
  IKbnUrlSyncStrategy,
} from './state_sync_strategies';
import { StubBrowserStorage } from 'test_utils/stub_browser_storage';
import { createBrowserHistory, History } from 'history';
import { INullableBaseStateContainer } from './types';

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

    it('should sync state to storage', () => {
      const key = '_s';
      const { start, stop } = syncState({
        stateContainer: withDefaultState(container, defaultState),
        syncKey: key,
        syncStrategy: testSyncStrategy,
      });
      start();

      // initial sync of state to storage is not happening
      expect(testSyncStrategy.toStorage).not.toBeCalled();

      container.transitions.add({
        id: 1,
        text: 'Learning transitions...',
        completed: false,
      });
      expect(testSyncStrategy.toStorage).toBeCalledWith(key, container.getState());
      stop();
    });

    it('should sync storage to state', () => {
      const key = '_s';
      const storageState1 = [{ id: 1, text: 'todo', completed: false }];
      (testSyncStrategy.fromStorage as jest.Mock).mockImplementation(() => storageState1);
      const { stop, start } = syncState({
        stateContainer: withDefaultState(container, defaultState),
        syncKey: key,
        syncStrategy: testSyncStrategy,
      });
      start();

      // initial sync of storage to state is not happening
      expect(container.getState()).toEqual(defaultState);

      const storageState2 = [{ id: 1, text: 'todo', completed: true }];
      (testSyncStrategy.fromStorage as jest.Mock).mockImplementation(() => storageState2);
      storageChange$.next(storageState2);

      expect(container.getState()).toEqual(storageState2);

      stop();
    });

    it('should not update storage if no actual state change happened', () => {
      const key = '_s';
      const { stop, start } = syncState({
        stateContainer: withDefaultState(container, defaultState),
        syncKey: key,
        syncStrategy: testSyncStrategy,
      });
      start();
      (testSyncStrategy.toStorage as jest.Mock).mockClear();

      container.set(defaultState);
      expect(testSyncStrategy.toStorage).not.toBeCalled();

      stop();
    });

    it('should not update state container if no actual storage change happened', () => {
      const key = '_s';
      const { stop, start } = syncState({
        stateContainer: withDefaultState(container, defaultState),
        syncKey: key,
        syncStrategy: testSyncStrategy,
      });
      start();

      const originalState = container.getState();
      const storageState = [...originalState];
      (testSyncStrategy.fromStorage as jest.Mock).mockImplementation(() => storageState);
      storageChange$.next(storageState);

      expect(container.getState()).toBe(originalState);

      stop();
    });

    it('storage change to null should notify state', () => {
      container.set([{ completed: false, id: 1, text: 'changed' }]);
      const { stop, start } = syncStates([
        {
          stateContainer: withDefaultState(container, defaultState),
          syncKey: '_s',
          syncStrategy: testSyncStrategy,
        },
      ]);
      start();

      (testSyncStrategy.fromStorage as jest.Mock).mockImplementation(() => null);
      storageChange$.next(null);

      expect(container.getState()).toEqual(defaultState);

      stop();
    });
  });

  describe('integration', () => {
    const key = '_s';
    const container = createStateContainer<TodoState, TodoActions>(defaultState, pureTransitions);

    let sessionStorage: StubBrowserStorage;
    let sessionStorageSyncStrategy: ISyncStrategy;
    let history: History;
    let urlSyncStrategy: IKbnUrlSyncStrategy;
    const getCurrentUrl = () => history.createHref(history.location);
    const tick = () => new Promise(resolve => setTimeout(resolve));

    beforeEach(() => {
      container.set(defaultState);

      window.location.href = '/';
      sessionStorage = new StubBrowserStorage();
      sessionStorageSyncStrategy = createSessionStorageSyncStrategy(sessionStorage);
      history = createBrowserHistory();
      urlSyncStrategy = createKbnUrlSyncStrategy({ useHash: false, history });
    });

    it('change to one storage should also update other storage', () => {
      const { stop, start } = syncStates([
        {
          stateContainer: withDefaultState(container, defaultState),
          syncKey: key,
          syncStrategy: urlSyncStrategy,
        },
        {
          stateContainer: withDefaultState(container, defaultState),
          syncKey: key,
          syncStrategy: sessionStorageSyncStrategy,
        },
      ]);
      start();

      const newStateFromUrl = [{ completed: false, id: 1, text: 'changed' }];
      history.replace('/#?_s=!((completed:!f,id:1,text:changed))');

      expect(container.getState()).toEqual(newStateFromUrl);
      expect(JSON.parse(sessionStorage.getItem(key)!)).toEqual(newStateFromUrl);

      stop();
    });

    it('KbnUrlSyncStrategy applies url updates asynchronously to trigger single history change', async () => {
      const { stop, start } = syncStates([
        {
          stateContainer: withDefaultState(container, defaultState),
          syncKey: key,
          syncStrategy: urlSyncStrategy,
        },
      ]);
      start();

      const startHistoryLength = history.length;
      container.transitions.add({ id: 2, text: '2', completed: false });
      container.transitions.add({ id: 3, text: '3', completed: false });
      container.transitions.completeAll();

      expect(history.length).toBe(startHistoryLength);
      expect(getCurrentUrl()).toMatchInlineSnapshot(`"/"`);

      await tick();
      expect(history.length).toBe(startHistoryLength + 1);

      expect(getCurrentUrl()).toMatchInlineSnapshot(
        `"/#?_s=!((completed:!t,id:0,text:'Learning%20state%20containers'),(completed:!t,id:2,text:'2'),(completed:!t,id:3,text:'3'))"`
      );

      stop();
    });

    it('KbnUrlSyncStrategy supports flushing url updates synchronously and triggers single history change', async () => {
      const { stop, start } = syncStates([
        {
          stateContainer: withDefaultState(container, defaultState),
          syncKey: key,
          syncStrategy: urlSyncStrategy,
        },
      ]);
      start();

      const startHistoryLength = history.length;
      container.transitions.add({ id: 2, text: '2', completed: false });
      container.transitions.add({ id: 3, text: '3', completed: false });
      container.transitions.completeAll();

      expect(history.length).toBe(startHistoryLength);
      expect(getCurrentUrl()).toMatchInlineSnapshot(`"/"`);

      urlSyncStrategy.flush();

      expect(history.length).toBe(startHistoryLength + 1);
      expect(getCurrentUrl()).toMatchInlineSnapshot(
        `"/#?_s=!((completed:!t,id:0,text:'Learning%20state%20containers'),(completed:!t,id:2,text:'2'),(completed:!t,id:3,text:'3'))"`
      );

      await tick();

      expect(history.length).toBe(startHistoryLength + 1);
      expect(getCurrentUrl()).toMatchInlineSnapshot(
        `"/#?_s=!((completed:!t,id:0,text:'Learning%20state%20containers'),(completed:!t,id:2,text:'2'),(completed:!t,id:3,text:'3'))"`
      );

      stop();
    });

    it('KbnUrlSyncStrategy supports cancellation of pending updates ', async () => {
      const { stop, start } = syncStates([
        {
          stateContainer: withDefaultState(container, defaultState),
          syncKey: key,
          syncStrategy: urlSyncStrategy,
        },
      ]);
      start();

      const startHistoryLength = history.length;
      container.transitions.add({ id: 2, text: '2', completed: false });
      container.transitions.add({ id: 3, text: '3', completed: false });
      container.transitions.completeAll();

      expect(history.length).toBe(startHistoryLength);
      expect(getCurrentUrl()).toMatchInlineSnapshot(`"/"`);

      urlSyncStrategy.cancel();

      expect(history.length).toBe(startHistoryLength);
      expect(getCurrentUrl()).toMatchInlineSnapshot(`"/"`);

      await tick();

      expect(history.length).toBe(startHistoryLength);
      expect(getCurrentUrl()).toMatchInlineSnapshot(`"/"`);

      stop();
    });
  });
});

function withDefaultState<State>(
  stateContainer: BaseStateContainer<State>,
  // eslint-disable-next-line no-shadow
  defaultState: State
): INullableBaseStateContainer<State> {
  return {
    ...stateContainer,
    set: (state: State | null) => {
      stateContainer.set(state || defaultState);
    },
  };
}
