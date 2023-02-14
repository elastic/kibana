/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { EuiButtonIcon, EuiCheckbox, EuiFieldText, EuiButtonGroup, EuiSpacer } from '@elastic/eui';

import {
  useSearchContentQuery,
  useCreateContentMutation,
  useDeleteContentMutation,
  useUpdateContentMutation,
  // eslint-disable-next-line @kbn/imports/no_boundary_crossing
} from '../../public/content_client';
import type { Todo } from './todos_client';
import { SearchIn, SearchOut, CreateIn, DeleteIn, UpdateIn } from '../../common';

export const Todos = () => {
  const [filterIdSelected, setFilterIdSelected] = React.useState('all');

  const { data, isLoading, isError, error } = useSearchContentQuery<SearchIn, SearchOut<Todo>>({
    contentType: 'todos',
    params: {
      filter: filterIdSelected,
    },
  });

  const addTodoMutation = useCreateContentMutation<CreateIn<'todos', { title: string }, Todo>>();
  const deleteTodoMutation = useDeleteContentMutation<DeleteIn<'todos', { id: string }, Todo>>();
  const updateTodoMutation = useUpdateContentMutation<UpdateIn<'todos', Todo, Todo>>();

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

  if (isLoading) return <p>Loading...</p>;
  if (isError) return <p>Error: {error}</p>;

  return (
    <>
      <EuiButtonGroup
        legend="Todo filters"
        options={filters}
        idSelected={filterIdSelected}
        onChange={(id) => setFilterIdSelected(id)}
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
                    contentType: 'todos',
                    data: {
                      ...todo,
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
                  deleteTodoMutation.mutate({ contentType: 'todos', data: { id: todo.id } });
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

          addTodoMutation.mutate({
            contentType: 'todos',
            data: {
              title: inputRef.value,
            },
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
