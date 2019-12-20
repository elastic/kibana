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
  syncState,
  useUrlTracker,
} from '../../../src/plugins/kibana_utils/public';
import {
  defaultState,
  pureTransitions,
  TodoActions,
  TodoState,
} from '../../../src/plugins/kibana_utils/demos/state_containers/todomvc';

const container = createStateContainer<TodoState, TodoActions>(defaultState, pureTransitions);
const { Provider, connect, useTransitions, useState } = createStateContainerReactHelpers<
  typeof container
>();

interface TodoAppProps {
  filter: 'completed' | 'not-completed' | null;
}

const TodoApp: React.FC<TodoAppProps> = ({ filter }) => {
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
          <EuiButton size={'s'}>All</EuiButton>
        </Link>
        <Link to={'/completed'}>
          <EuiButton size={'s'}>Completed</EuiButton>
        </Link>
        <Link to={'/not-completed'}>
          <EuiButton size={'s'}>Not Completed</EuiButton>
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
    </>
  );
};

const TodoAppConnected = connect<TodoAppProps, never>(() => ({}))(TodoApp);

export const TodoAppPage: React.FC<{
  history: History;
  appInstanceId: string;
  appBasePath: string;
}> = props => {
  const [useHashedUrl, setUseHashedUrl] = React.useState(false);

  /**
   * Replicates what src/legacy/ui/public/chrome/api/nav.ts did
   * Persists the url in sessionStorage and tries to restore it on "componentDidMount"
   */
  useUrlTracker(props.appInstanceId, props.history, urlToRestore => {
    // shouldRestoreUrl:
    // Allow to restore url only if navigated to app's basePath
    const currentAppUrl = stripTrailingSlash(props.history.createHref(props.history.location));
    if (currentAppUrl === stripTrailingSlash(props.appBasePath)) {
      // navigated to the base path, so should restore the url
      return true;
    } else {
      // navigated to specific route, so should not restore the url
      return false;
    }
  });

  useEffect(() => {
    const destroySyncState = syncState([
      {
        stateContainer: container,
        syncKey: '_todo',

        // have to sync with history passed to react-router
        // history v5 will be singleton and this will not be needed
        syncStrategy: createUrlSyncStrategy({ useHash: useHashedUrl, history: props.history }),
      },

      // This could be used instead of useUrlTracker
      // if all the state we want to sync
      // is inside state containers:
      // {
      //   stateContainer: container,
      //   syncKey: 'preserve-todo-between-navigations',
      //   syncStrategy: SyncStrategy.SessionStorage,
      // },
    ]);
    return () => {
      destroySyncState();
    };
  }, [props.history, useHashedUrl]);

  return (
    <Router history={props.history}>
      <Provider value={container}>
        <EuiPageBody>
          <EuiPageHeader>
            <EuiPageHeaderSection>
              <EuiTitle size="l">
                <h1>State sync example. Instance: ${props.appInstanceId}</h1>
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
    </Router>
  );
};

function stripTrailingSlash(path: string) {
  return path.charAt(path.length - 1) === '/' ? path.substr(0, path.length - 1) : path;
}
