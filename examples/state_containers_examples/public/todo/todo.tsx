/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useMemo } from 'react';
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
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import {
  BaseState,
  BaseStateContainer,
  createKbnUrlStateStorage,
  createStateContainer,
  getStateFromKbnUrl,
  INullableBaseStateContainer,
  StateContainer,
  syncState,
  useContainerSelector,
} from '@kbn/kibana-utils-plugin/public';
import {
  defaultState,
  pureTransitions,
  TodoActions,
  TodoState,
} from '@kbn/kibana-utils-plugin/demos/state_containers/todomvc';

interface TodoAppProps {
  filter: 'completed' | 'not-completed' | null;
  stateContainer: StateContainer<TodoState, TodoActions>;
}

const TodoApp: React.FC<TodoAppProps> = ({ filter, stateContainer }) => {
  const { edit: editTodo, delete: deleteTodo, add: addTodo } = stateContainer.transitions;
  const todos = useContainerSelector(stateContainer, (state) => state.todos);
  const filteredTodos = useMemo(
    () =>
      todos.filter((todo) => {
        if (!filter) return true;
        if (filter === 'completed') return todo.completed;
        if (filter === 'not-completed') return !todo.completed;
        return true;
      }),
    [todos, filter]
  );
  const location = useLocation();
  return (
    <>
      <div>
        <Link to={{ ...location, pathname: '/' }} data-test-subj={'filterLinkAll'}>
          <EuiButton size={'s'} color={!filter ? 'primary' : 'success'}>
            All
          </EuiButton>
        </Link>
        <Link to={{ ...location, pathname: '/completed' }} data-test-subj={'filterLinkCompleted'}>
          <EuiButton size={'s'} color={filter === 'completed' ? 'primary' : 'success'}>
            Completed
          </EuiButton>
        </Link>
        <Link
          to={{ ...location, pathname: '/not-completed' }}
          data-test-subj={'filterLinkNotCompleted'}
        >
          <EuiButton size={'s'} color={filter === 'not-completed' ? 'primary' : 'success'}>
            Not Completed
          </EuiButton>
        </Link>
      </div>
      <ul>
        {filteredTodos.map((todo) => (
          <li key={todo.id} style={{ display: 'flex', alignItems: 'center', margin: '16px 0px' }}>
            <EuiCheckbox
              id={todo.id + ''}
              key={todo.id}
              checked={todo.completed}
              onChange={(e) => {
                editTodo({
                  ...todo,
                  completed: e.target.checked,
                });
              }}
              label={todo.text}
              data-test-subj={`todoCheckbox-${todo.id}`}
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
        onSubmit={(e) => {
          const inputRef = (e.target as HTMLFormElement).elements.namedItem(
            'newTodo'
          ) as HTMLInputElement;
          if (!inputRef || !inputRef.value) return;
          addTodo({
            text: inputRef.value,
            completed: false,
            id: todos.map((todo) => todo.id).reduce((a, b) => Math.max(a, b), 0) + 1,
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

export const TodoAppPage: React.FC<{
  history: History;
  appTitle: string;
  appBasePath: string;
}> = (props) => {
  const initialAppUrl = React.useRef(window.location.href);
  const stateContainer = React.useMemo(
    () => createStateContainer<TodoState, TodoActions>(defaultState, pureTransitions),
    []
  );

  // Most of kibana apps persist state in the URL in two ways:
  // * Rison encoded.
  // * Hashed URL: In the URL only the hash from the state is stored. The state itself is stored in
  //   the sessionStorage. See `state:storeInSessionStorage` advanced option for more context.
  // This example shows how to use both of them
  const [useHashedUrl, setUseHashedUrl] = React.useState(false);

  useEffect(() => {
    // storage to sync our app state with
    // in this case we want to sync state with query params in the URL serialised in rison format
    // similar like Discover or Dashboard apps do
    const kbnUrlStateStorage = createKbnUrlStateStorage({
      useHash: useHashedUrl,
      history: props.history,
    });

    // key to store state in the storage. In this case in the key of the query param in the URL
    const appStateKey = `_todo`;

    // take care of initial state. Make sure state in memory is the same as in the URL before starting any syncing
    const initialAppState: TodoState =
      getStateFromKbnUrl<TodoState>(appStateKey, initialAppUrl.current) ||
      kbnUrlStateStorage.get<TodoState>(appStateKey) ||
      defaultState;
    stateContainer.set(initialAppState);
    kbnUrlStateStorage.set(appStateKey, initialAppState, { replace: true });

    // start syncing state between state container and the URL
    const { stop, start } = syncState({
      stateContainer: withDefaultState(stateContainer, defaultState),
      storageKey: appStateKey,
      stateStorage: kbnUrlStateStorage,
    });

    start();

    return () => {
      stop();
    };
  }, [stateContainer, props.history, useHashedUrl]);

  return (
    <Router history={props.history}>
      <EuiPageBody>
        <EuiPageHeader>
          <EuiPageHeaderSection>
            <EuiTitle size="l">
              <h1>{props.appTitle}</h1>
            </EuiTitle>
            <EuiSpacer />
            <EuiText>
              <p>
                This is a simple TODO app that uses state containers and state syncing utils. It
                stores state in the URL similar like Discover or Dashboard apps do. <br />
                Play with the app and see how the state is persisted in the URL.
                <br /> Undo/Redo with browser history also works.
              </p>
            </EuiText>
          </EuiPageHeaderSection>
        </EuiPageHeader>
        <EuiPageContent>
          <EuiPageContentBody>
            <Switch>
              <Route path={'/completed'}>
                <TodoApp filter={'completed'} stateContainer={stateContainer} />
              </Route>
              <Route path={'/not-completed'}>
                <TodoApp filter={'not-completed'} stateContainer={stateContainer} />
              </Route>
              <Route path={'/'}>
                <TodoApp filter={null} stateContainer={stateContainer} />
              </Route>
            </Switch>
            <EuiSpacer size={'xxl'} />
            <EuiText size={'s'}>
              <p>Most of kibana apps persist state in the URL in two ways:</p>
              <ol>
                <li>Expanded state in rison format</li>
                <li>
                  Just a state hash. <br />
                  In the URL only the hash from the state is stored. The state itself is stored in
                  the sessionStorage. See `state:storeInSessionStorage` advanced option for more
                  context.
                </li>
              </ol>
              <p>You can switch between these two mods:</p>
            </EuiText>
            <EuiSpacer />
            <EuiButton onClick={() => setUseHashedUrl(!useHashedUrl)}>
              {useHashedUrl ? 'Use Expanded State' : 'Use Hashed State'}
            </EuiButton>
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    </Router>
  );
};

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
