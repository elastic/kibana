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
  syncState,
} from '../../../src/plugins/kibana_utils/public';
import {
  defaultState,
  pureTransitions,
  TodoActions,
  TodoState,
} from '../../../src/plugins/kibana_utils/demos/state_containers/todomvc';
import { createUrlSyncStrategy } from '../../../src/plugins/kibana_utils/public/state_sync/state_sync_strategies';

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

export const TodoAppPage: React.FC<{ history: History }> = props => {
  const [useHashedUrl, setUseHashedUrl] = React.useState(false);
  useEffect(() => {
    const destroySyncState = syncState({
      stateContainer: container,
      syncKey: '_todo',

      // have to sync with history passed to react-router
      // history v5 will be singleton and this will not be needed
      syncStrategy: createUrlSyncStrategy({ useHash: useHashedUrl, history: props.history }),
    });
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
                <h1>State Containers Sync State Util - Todo example</h1>
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
