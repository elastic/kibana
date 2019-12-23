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
import { Link, Route, Router, Switch } from 'react-router-dom';
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
  createStateContainer,
  createStateContainerReactHelpers,
  createUrlSyncStrategy,
  PureTransition,
  syncState,
  SyncStrategy,
  useUrlTracker,
} from '../../../src/plugins/kibana_utils/public';
import {
  defaultState,
  pureTransitions,
  TodoActions,
  TodoState,
} from '../../../src/plugins/kibana_utils/demos/state_containers/todomvc';

interface GlobalState {
  text: string;
}
interface GlobalStateAction {
  setText: PureTransition<GlobalState, [string]>;
}
const globalStateContainer = createStateContainer<GlobalState, GlobalStateAction>(
  { text: '' },
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
  return (
    <>
      <div>
        <Link to={'/'}>
          <EuiButton size={'s'} color={!filter ? 'primary' : 'secondary'}>
            All
          </EuiButton>
        </Link>
        <Link to={'/completed'}>
          <EuiButton size={'s'} color={filter === 'completed' ? 'primary' : 'secondary'}>
            Completed
          </EuiButton>
        </Link>
        <Link to={'/not-completed'}>
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
  isBasePathRoute: () => boolean;
}> = props => {
  const [useHashedUrl, setUseHashedUrl] = React.useState(false);

  /**
   * Replicates what src/legacy/ui/public/chrome/api/nav.ts did
   * Persists the url in sessionStorage and tries to restore it on "componentDidMount"
   */
  useUrlTracker(props.appInstanceId, props.history, urlToRestore => {
    // shouldRestoreUrl:
    // App decides if it should restore url or not
    // In this specific case, restore only if navigated to app base path
    if (props.isBasePathRoute()) {
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
    const urlSyncStrategy = createUrlSyncStrategy({
      useHash: useHashedUrl,
      history: props.history,
    });
    const destroySyncState = syncState([
      {
        stateContainer: container,
        syncKey: `_todo-${props.appInstanceId}`,
        syncStrategy: urlSyncStrategy,
      },
      {
        stateContainer: globalStateContainer,
        syncKey: '_g',
        syncStrategy: urlSyncStrategy,
      },
      {
        stateContainer: globalStateContainer,
        syncKey: '_g',
        syncStrategy: SyncStrategy.SessionStorage,
      },
    ]);
    return () => {
      destroySyncState();

      // reset state containers
      container.set(defaultState);
      globalStateContainer.set({ text: '' });
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
