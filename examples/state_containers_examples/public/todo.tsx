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

import React, { useEffect } from 'react';
import { Link, Route, Router, Switch, useLocation } from 'react-router-dom';
import { History } from 'history';
import {
  EuiButton,
  EuiCheckbox,
  EuiFieldText,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiTitle,
} from '@elastic/eui';
import {
  BaseStateContainer,
  createKbnUrlSyncStrategy,
  createStateContainer,
  createStateContainerReactHelpers,
  PureTransition,
  INullableBaseStateContainer,
  syncStates,
  useUrlTracker,
} from '../../../src/plugins/kibana_utils/public';
import {
  defaultState,
  pureTransitions,
  TodoActions,
  TodoState,
} from '../../../src/plugins/kibana_utils/demos/state_containers/todomvc';
import { createSessionStorageSyncStrategy } from '../../../src/plugins/kibana_utils/public/state_sync/state_sync_strategies';
import { getStateFromKbnUrl } from '../../../src/plugins/kibana_utils/public/state_management/url';

interface GlobalState {
  text: string;
}
interface GlobalStateAction {
  setText: PureTransition<GlobalState, [string]>;
}
const defaultGlobalState: GlobalState = { text: '' };
const globalStateContainer = createStateContainer<GlobalState, GlobalStateAction>(
  defaultGlobalState,
  {
    setText: state => text => ({ ...state, text }),
  }
);

const GlobalStateHelpers = createStateContainerReactHelpers<typeof globalStateContainer>();

const container = createStateContainer<TodoState, TodoActions>(defaultState, pureTransitions);
const { Provider, connect, useTransitions, useState } = createStateContainerReactHelpers<
  typeof container
>();

interface TodoAppProps {
  filter: 'completed' | 'not-completed' | null;
}

const TodoApp: React.FC<TodoAppProps> = ({ filter }) => {
  const { setText } = GlobalStateHelpers.useTransitions();
  const { text } = GlobalStateHelpers.useState();
  const { edit: editTodo, delete: deleteTodo, add: addTodo } = useTransitions();
  const todos = useState();
  const filteredTodos = todos.filter(todo => {
    if (!filter) return true;
    if (filter === 'completed') return todo.completed;
    if (filter === 'not-completed') return !todo.completed;
    return true;
  });
  const location = useLocation();
  return (
    <>
      <div>
        <Link to={{ ...location, pathname: '/' }}>
          <EuiButton size={'s'} color={!filter ? 'primary' : 'secondary'}>
            All
          </EuiButton>
        </Link>
        <Link to={{ ...location, pathname: '/completed' }}>
          <EuiButton size={'s'} color={filter === 'completed' ? 'primary' : 'secondary'}>
            Completed
          </EuiButton>
        </Link>
        <Link to={{ ...location, pathname: '/not-completed' }}>
          <EuiButton size={'s'} color={filter === 'not-completed' ? 'primary' : 'secondary'}>
            Not Completed
          </EuiButton>
        </Link>
      </div>
      <ul>
        {filteredTodos.map(todo => (
          <li key={todo.id} style={{ display: 'flex', alignItems: 'center', margin: '16px 0px' }}>
            <EuiCheckbox
              id={todo.id + ''}
              key={todo.id}
              checked={todo.completed}
              onChange={e => {
                editTodo({
                  ...todo,
                  completed: e.target.checked,
                });
              }}
              label={todo.text}
            />
            <EuiButton
              style={{ marginLeft: '8px' }}
              size={'s'}
              onClick={() => {
                deleteTodo(todo.id);
              }}
            >
              Delete
            </EuiButton>
          </li>
        ))}
      </ul>
      <form
        onSubmit={e => {
          const inputRef = (e.target as HTMLFormElement).elements.namedItem(
            'newTodo'
          ) as HTMLInputElement;
          if (!inputRef || !inputRef.value) return;
          addTodo({
            text: inputRef.value,
            completed: false,
            id: todos.map(todo => todo.id).reduce((a, b) => Math.max(a, b), 0) + 1,
          });
          inputRef.value = '';
          e.preventDefault();
        }}
      >
        <EuiFieldText placeholder="Type your todo and press enter to submit" name="newTodo" />
      </form>
      <div style={{ margin: '16px 0px' }}>
        <label htmlFor="globalInput">Global state piece: </label>
        <input name="globalInput" value={text} onChange={e => setText(e.target.value)} />
      </div>
    </>
  );
};

const TodoAppConnected = GlobalStateHelpers.connect<TodoAppProps, never>(() => ({}))(
  connect<TodoAppProps, never>(() => ({}))(TodoApp)
);

export const TodoAppPage: React.FC<{
  history: History;
  appInstanceId: string;
  appTitle: string;
  appBasePath: string;
  isInitialRoute: () => boolean;
}> = props => {
  const initialAppUrl = React.useRef(window.location.href);
  const [useHashedUrl, setUseHashedUrl] = React.useState(false);

  /**
   * Replicates what src/legacy/ui/public/chrome/api/nav.ts did
   * Persists the url in sessionStorage and tries to restore it on "componentDidMount"
   */
  useUrlTracker(`lastUrlTracker:${props.appInstanceId}`, props.history, urlToRestore => {
    // shouldRestoreUrl:
    // App decides if it should restore url or not
    // In this specific case, restore only if navigated to initial route
    if (props.isInitialRoute()) {
      // navigated to the base path, so should restore the url
      return true;
    } else {
      // navigated to specific route, so should not restore the url
      return false;
    }
  });

  useEffect(() => {
    // have to sync with history passed to react-router
    // history v5 will be singleton and this will not be needed
    const urlSyncStrategy = createKbnUrlSyncStrategy({
      useHash: useHashedUrl,
      history: props.history,
    });

    const sessionStorageSyncStrategy = createSessionStorageSyncStrategy();

    /**
     * Restoring global state:
     * State restoration similar to what GlobalState in legacy world did
     * It restores state both from url and from session storage
     */
    const globalStateKey = `_g`;
    const globalStateFromInitialUrl = getStateFromKbnUrl<GlobalState>(
      globalStateKey,
      initialAppUrl.current
    );
    const globalStateFromCurrentUrl = urlSyncStrategy.fromStorage<GlobalState>(globalStateKey);
    const globalStateFromSessionStorage = sessionStorageSyncStrategy.fromStorage<GlobalState>(
      globalStateKey
    );

    const initialGlobalState: GlobalState = {
      ...defaultGlobalState,
      ...globalStateFromCurrentUrl,
      ...globalStateFromSessionStorage,
      ...globalStateFromInitialUrl,
    };
    globalStateContainer.set(initialGlobalState);
    urlSyncStrategy.toStorage(globalStateKey, initialGlobalState, { replace: true });
    sessionStorageSyncStrategy.toStorage(globalStateKey, initialGlobalState);

    /**
     * Restoring app local state:
     * State restoration similar to what AppState in legacy world did
     * It restores state both from url
     */
    const appStateKey = `_todo-${props.appInstanceId}`;
    const initialAppState: TodoState =
      getStateFromKbnUrl<TodoState>(appStateKey, initialAppUrl.current) ||
      urlSyncStrategy.fromStorage<TodoState>(appStateKey) ||
      defaultState;
    container.set(initialAppState);
    urlSyncStrategy.toStorage(appStateKey, initialAppState, { replace: true });

    // start syncing only when made sure, that state in synced
    const { stop } = syncStates([
      {
        stateContainer: withDefaultState(container, defaultState),
        syncKey: appStateKey,
        syncStrategy: urlSyncStrategy,
      },
      {
        stateContainer: withDefaultState(globalStateContainer, defaultGlobalState),
        syncKey: globalStateKey,
        syncStrategy: urlSyncStrategy,
      },
      {
        stateContainer: withDefaultState(globalStateContainer, defaultGlobalState),
        syncKey: globalStateKey,
        syncStrategy: sessionStorageSyncStrategy,
      },
    ]);

    return () => {
      stop();

      // reset state containers
      container.set(defaultState);
      globalStateContainer.set(defaultGlobalState);
    };
  }, [props.appInstanceId, props.history, useHashedUrl]);

  return (
    <Router history={props.history}>
      <GlobalStateHelpers.Provider value={globalStateContainer}>
        <Provider value={container}>
          <EuiPageBody>
            <EuiPageHeader>
              <EuiPageHeaderSection>
                <EuiTitle size="l">
                  <h1>
                    State sync example. Instance: ${props.appInstanceId}. {props.appTitle}
                  </h1>
                </EuiTitle>
                <EuiButton onClick={() => setUseHashedUrl(!useHashedUrl)}>
                  {useHashedUrl ? 'Use Expanded State' : 'Use Hashed State'}
                </EuiButton>
              </EuiPageHeaderSection>
            </EuiPageHeader>
            <EuiPageContent>
              <EuiPageContentBody>
                <Switch>
                  <Route path={'/completed'}>
                    <TodoAppConnected filter={'completed'} />
                  </Route>
                  <Route path={'/not-completed'}>
                    <TodoAppConnected filter={'not-completed'} />
                  </Route>
                  <Route path={'/'}>
                    <TodoAppConnected filter={null} />
                  </Route>
                </Switch>
              </EuiPageContentBody>
            </EuiPageContent>
          </EuiPageBody>
        </Provider>
      </GlobalStateHelpers.Provider>
    </Router>
  );
};

function withDefaultState<State>(
  stateContainer: BaseStateContainer<State>,
  // eslint-disable-next-line no-shadow
  defaultState: State
): INullableBaseStateContainer<State> {
  return {
    ...stateContainer,
    set: (state: State | null) => {
      if (Array.isArray(defaultState)) {
        stateContainer.set(state || defaultState);
      } else {
        stateContainer.set({
          ...defaultState,
          ...state,
        });
      }
    },
  };
}
