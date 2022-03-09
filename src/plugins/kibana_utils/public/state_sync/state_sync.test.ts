/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BaseState, BaseStateContainer, createStateContainer } from '../../common/state_containers';
import {
  defaultState,
  pureTransitions,
  TodoActions,
  TodoState,
} from '../../demos/state_containers/todomvc';
import { syncState, syncStates } from './state_sync';
import { IStateStorage } from './state_sync_state_storage/types';
import { Observable, Subject } from 'rxjs';
import {
  createSessionStorageStateStorage,
  createKbnUrlStateStorage,
  IKbnUrlStateStorage,
  ISessionStorageStateStorage,
} from './state_sync_state_storage';
import { StubBrowserStorage } from '@kbn/test-jest-helpers';
import { createBrowserHistory, History } from 'history';
import { INullableBaseStateContainer } from './types';

describe('state_sync', () => {
  describe('basic', () => {
    const container = createStateContainer<TodoState, TodoActions>(defaultState, pureTransitions);
    beforeEach(() => {
      container.set(defaultState);
    });
    const storageChange$ = new Subject<TodoState | null>();
    let testStateStorage: IStateStorage;

    beforeEach(() => {
      testStateStorage = {
        set: jest.fn(),
        get: jest.fn(),
        change$: <State>(key: string) => storageChange$.asObservable() as Observable<State | null>,
      };
    });

    it('should sync state to storage', () => {
      const key = '_s';
      const { start, stop } = syncState({
        stateContainer: withDefaultState(container, defaultState),
        storageKey: key,
        stateStorage: testStateStorage,
      });
      start();

      // initial sync of state to storage is not happening
      expect(testStateStorage.set).not.toBeCalled();

      container.transitions.add({
        id: 1,
        text: 'Learning transitions...',
        completed: false,
      });
      expect(testStateStorage.set).toBeCalledWith(key, container.getState());
      stop();
    });

    it('should sync storage to state', () => {
      const key = '_s';
      const storageState1 = [{ id: 1, text: 'todo', completed: false }];
      (testStateStorage.get as jest.Mock).mockImplementation(() => storageState1);
      const { stop, start } = syncState({
        stateContainer: withDefaultState(container, defaultState),
        storageKey: key,
        stateStorage: testStateStorage,
      });
      start();

      // initial sync of storage to state is not happening
      expect(container.getState()).toEqual(defaultState);

      const storageState2 = { todos: [{ id: 1, text: 'todo', completed: true }] };
      (testStateStorage.get as jest.Mock).mockImplementation(() => storageState2);
      storageChange$.next(storageState2);

      expect(container.getState()).toEqual(storageState2);

      stop();
    });

    it('should not update storage if no actual state change happened', () => {
      const key = '_s';
      const { stop, start } = syncState({
        stateContainer: withDefaultState(container, defaultState),
        storageKey: key,
        stateStorage: testStateStorage,
      });
      start();
      (testStateStorage.set as jest.Mock).mockClear();

      container.set(defaultState);
      expect(testStateStorage.set).not.toBeCalled();

      stop();
    });

    it('should not update state container if no actual storage change happened', () => {
      const key = '_s';
      const { stop, start } = syncState({
        stateContainer: withDefaultState(container, defaultState),
        storageKey: key,
        stateStorage: testStateStorage,
      });
      start();

      const originalState = container.getState();
      const storageState = { ...originalState };
      (testStateStorage.get as jest.Mock).mockImplementation(() => storageState);
      storageChange$.next(storageState);

      expect(container.getState()).toBe(originalState);

      stop();
    });

    it('storage change to null should notify state', () => {
      container.set({ todos: [{ completed: false, id: 1, text: 'changed' }] });
      const { stop, start } = syncStates([
        {
          stateContainer: withDefaultState(container, defaultState),
          storageKey: '_s',
          stateStorage: testStateStorage,
        },
      ]);
      start();

      (testStateStorage.get as jest.Mock).mockImplementation(() => null);
      storageChange$.next(null);

      expect(container.getState()).toEqual(defaultState);

      stop();
    });

    it('storage change with incomplete or differently shaped object should notify state and set new object as is', () => {
      container.set({ todos: [{ completed: false, id: 1, text: 'changed' }] });
      const { stop, start } = syncStates([
        {
          stateContainer: container,
          storageKey: '_s',
          stateStorage: testStateStorage,
        },
      ]);
      start();

      const differentlyShapedObject = {
        different: 'test',
      };
      (testStateStorage.get as jest.Mock).mockImplementation(() => differentlyShapedObject);
      storageChange$.next(differentlyShapedObject as any);

      expect(container.getState()).toStrictEqual(differentlyShapedObject);

      stop();
    });
  });

  describe('integration', () => {
    const key = '_s';
    const container = createStateContainer<TodoState, TodoActions>(defaultState, pureTransitions);

    let sessionStorage: StubBrowserStorage;
    let sessionStorageSyncStrategy: ISessionStorageStateStorage;
    let history: History;
    let urlSyncStrategy: IKbnUrlStateStorage;
    const getCurrentUrl = () => history.createHref(history.location);
    const tick = () => new Promise((resolve) => setTimeout(resolve));

    beforeEach(() => {
      container.set(defaultState);

      window.location.href = '/';
      sessionStorage = new StubBrowserStorage();
      sessionStorageSyncStrategy = createSessionStorageStateStorage(sessionStorage);
      history = createBrowserHistory();
      urlSyncStrategy = createKbnUrlStateStorage({ useHash: false, history });
    });

    it('change to one storage should also update other storage', () => {
      const { stop, start } = syncStates([
        {
          stateContainer: withDefaultState(container, defaultState),
          storageKey: key,
          stateStorage: urlSyncStrategy,
        },
        {
          stateContainer: withDefaultState(container, defaultState),
          storageKey: key,
          stateStorage: sessionStorageSyncStrategy,
        },
      ]);
      start();

      const newStateFromUrl = { todos: [{ completed: false, id: 1, text: 'changed' }] };
      history.replace('/#?_s=(todos:!((completed:!f,id:1,text:changed)))');

      expect(container.getState()).toEqual(newStateFromUrl);
      expect(JSON.parse(sessionStorage.getItem(key)!)).toEqual(newStateFromUrl);

      stop();
    });

    it('KbnUrlSyncStrategy applies url updates asynchronously to trigger single history change', async () => {
      const { stop, start } = syncStates([
        {
          stateContainer: withDefaultState(container, defaultState),
          storageKey: key,
          stateStorage: urlSyncStrategy,
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
        `"/#?_s=(todos:!((completed:!t,id:0,text:'Learning%20state%20containers'),(completed:!t,id:2,text:'2'),(completed:!t,id:3,text:'3')))"`
      );

      stop();
    });

    it('KbnUrlSyncStrategy supports flushing url updates synchronously and triggers single history change', async () => {
      const { stop, start } = syncStates([
        {
          stateContainer: withDefaultState(container, defaultState),
          storageKey: key,
          stateStorage: urlSyncStrategy,
        },
      ]);
      start();

      const startHistoryLength = history.length;
      container.transitions.add({ id: 2, text: '2', completed: false });
      container.transitions.add({ id: 3, text: '3', completed: false });
      container.transitions.completeAll();

      expect(history.length).toBe(startHistoryLength);
      expect(getCurrentUrl()).toMatchInlineSnapshot(`"/"`);

      urlSyncStrategy.kbnUrlControls.flush();

      expect(history.length).toBe(startHistoryLength + 1);
      expect(getCurrentUrl()).toMatchInlineSnapshot(
        `"/#?_s=(todos:!((completed:!t,id:0,text:'Learning%20state%20containers'),(completed:!t,id:2,text:'2'),(completed:!t,id:3,text:'3')))"`
      );

      await tick();

      expect(history.length).toBe(startHistoryLength + 1);
      expect(getCurrentUrl()).toMatchInlineSnapshot(
        `"/#?_s=(todos:!((completed:!t,id:0,text:'Learning%20state%20containers'),(completed:!t,id:2,text:'2'),(completed:!t,id:3,text:'3')))"`
      );

      stop();
    });

    it('KbnUrlSyncStrategy supports cancellation of pending updates ', async () => {
      const { stop, start } = syncStates([
        {
          stateContainer: withDefaultState(container, defaultState),
          storageKey: key,
          stateStorage: urlSyncStrategy,
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

    it('cancels pending URL updates when sync stops', async () => {
      const { stop, start } = syncStates([
        {
          stateContainer: withDefaultState(container, defaultState),
          storageKey: key,
          stateStorage: urlSyncStrategy,
        },
      ]);
      start();

      const startHistoryLength = history.length;
      container.transitions.add({ id: 2, text: '2', completed: false });
      container.transitions.add({ id: 3, text: '3', completed: false });
      container.transitions.completeAll();

      expect(history.length).toBe(startHistoryLength);
      expect(getCurrentUrl()).toMatchInlineSnapshot(`"/"`);

      stop();

      await tick();

      expect(history.length).toBe(startHistoryLength);
      expect(getCurrentUrl()).toMatchInlineSnapshot(`"/"`);
    });

    it("should preserve reference to unchanged state slices if them didn't change", async () => {
      const otherUnchangedSlice = { a: 'test' };
      const oldState = {
        todos: container.get().todos,
        otherUnchangedSlice,
      };
      container.set(oldState as any);

      const { stop, start } = syncStates([
        {
          stateContainer: withDefaultState(container, defaultState),
          storageKey: key,
          stateStorage: urlSyncStrategy,
        },
      ]);
      await urlSyncStrategy.set('_s', container.get());
      expect(getCurrentUrl()).toMatchInlineSnapshot(
        `"/#?_s=(otherUnchangedSlice:(a:test),todos:!((completed:!f,id:0,text:'Learning%20state%20containers')))"`
      );
      start();

      history.replace(
        "/#?_s=(otherUnchangedSlice:(a:test),todos:!((completed:!t,id:0,text:'Learning%20state%20containers')))"
      );

      const newState = container.get();
      expect(newState.todos).toEqual([
        { id: 0, text: 'Learning state containers', completed: true },
      ]);

      // reference to unchanged slice is preserved
      expect((newState as any).otherUnchangedSlice).toBe(otherUnchangedSlice);

      stop();
    });
  });
});

function withDefaultState<State extends BaseState>(
  stateContainer: BaseStateContainer<State>,
  // eslint-disable-next-line @typescript-eslint/no-shadow
  defaultState: State
): INullableBaseStateContainer<State> {
  return {
    ...stateContainer,
    set: (state: State | null) => {
      stateContainer.set({
        ...defaultState,
        ...state,
      });
    },
  };
}
