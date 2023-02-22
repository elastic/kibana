/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { EuiButtonGroup, EuiButtonIcon, EuiCheckbox, EuiFieldText, EuiSpacer } from '@elastic/eui';

import {
  useCreateContentMutation,
  useDeleteContentMutation,
  useSearchContentQuery,
  useUpdateContentMutation,
  // eslint-disable-next-line @kbn/imports/no_boundary_crossing
} from '../../public/content_client';
import type { Todo, TodoCreateIn, TodoDeleteIn, TodoSearchIn, TodoUpdateIn } from './todos_client';

const useCreateTodoMutation = () => useCreateContentMutation<TodoCreateIn, Todo>();
const useDeleteTodoMutation = () => useDeleteContentMutation<TodoDeleteIn, void>();
const useUpdateTodoMutation = () => useUpdateContentMutation<TodoUpdateIn, Todo>();
const useSearchTodosQuery = ({ filter }: { filter: TodoSearchIn['query']['filter'] }) =>
  useSearchContentQuery<TodoSearchIn, { hits: Todo[] }>({
    contentTypeId: 'todos',
    query: { filter },
  });

type TodoFilter = 'all' | 'completed' | 'todo';
const filters = [
  {
    id: `all`,
    label: 'All',
  },
  {
    id: `completed`,
    label: 'Completed',
  },
  {
    id: `todo`,
    label: 'Todo',
  },
];

export const Todos = () => {
  const [filterIdSelected, setFilterIdSelected] = React.useState<TodoFilter>('all');

  const { data, isLoading, isError, error } = useSearchTodosQuery({
    filter: filterIdSelected === 'all' ? undefined : filterIdSelected,
  });

  const createTodoMutation = useCreateTodoMutation();
  const deleteTodoMutation = useDeleteTodoMutation();
  const updateTodoMutation = useUpdateTodoMutation();

  if (isLoading) return <p>Loading...</p>;
  if (isError) return <p>Error: {error}</p>;

  return (
    <>
      <EuiButtonGroup
        legend="Todo filters"
        options={filters}
        idSelected={filterIdSelected}
        onChange={(id) => {
          setFilterIdSelected(id as TodoFilter);
        }}
      />
      <EuiSpacer />
      <ul>
        {data.hits.map((todo: Todo) => (
          <React.Fragment key={todo.id}>
            <li style={{ display: 'flex', alignItems: 'center' }}>
              <EuiCheckbox
                id={todo.id + ''}
                key={todo.id}
                checked={todo.completed}
                onChange={(e) => {
                  updateTodoMutation.mutate({
                    contentTypeId: 'todos',
                    id: todo.id,
                    data: {
                      completed: e.target.checked,
                    },
                  });
                }}
                label={todo.title}
                data-test-subj={`todoCheckbox-${todo.id}`}
              />

              <EuiButtonIcon
                style={{ marginLeft: '8px' }}
                display="base"
                iconType="trash"
                aria-label="Delete"
                color="danger"
                onClick={() => {
                  deleteTodoMutation.mutate({ contentTypeId: 'todos', id: todo.id });
                }}
              />
            </li>
            <EuiSpacer size={'xs'} />
          </React.Fragment>
        ))}
      </ul>
      <EuiSpacer />
      <form
        onSubmit={(e) => {
          const inputRef = (e.target as HTMLFormElement).elements.namedItem(
            'newTodo'
          ) as HTMLInputElement;
          if (!inputRef || !inputRef.value) return;

          createTodoMutation.mutate({
            contentTypeId: 'todos',
            data: {
              title: inputRef.value,
            },
          });

          inputRef.value = '';
          e.preventDefault();
        }}
      >
        <EuiFieldText
          placeholder="Type your todo and press enter to submit"
          name={'newTodo'}
          data-test-subj={'newTodo'}
        />
      </form>
    </>
  );
};
