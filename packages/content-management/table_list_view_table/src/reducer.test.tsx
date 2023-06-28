/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { Query } from '@elastic/eui';
import { Ast } from '@elastic/eui';
import { getReducer } from './reducer';
import type { State, UserContentCommonSchema } from './table_list_view_table';
import {
  DeleteItemsActions,
  OnFetchItemsAction,
  OnFetchItemsErrorAction,
  OnFetchItemsSuccessAction,
  OnSearchQueryChangeAction,
  OnSelectionChangeAction,
  OnTableChangeAction,
  ShowConfirmDeleteItemsModalAction,
} from './actions';

describe('getReducer', () => {
  let state: State<UserContentCommonSchema>;

  beforeEach(() => {
    state = {
      // Set up the initial state here
      isFetchingItems: false,
      hasInitialFetchReturned: false,
      items: [],
      totalItems: 0,
      hasUpdatedAtMetadata: false,
      tableSort: {
        field: 'attributes.title' as const,
        direction: 'asc',
      },
      pagination: {
        totalItemCount: 0,
        pageIndex: 0,
        pageSize: 10,
      },
      fetchError: {} as IHttpFetchError<Error>,
      searchQuery: { text: '', query: {} as Query },
      showDeleteModal: false,
      isDeletingItems: false,
      selectedIds: [],
    };
  });

  it('should update state on "onFetchItems" action', () => {
    const reducer = getReducer();
    const action: OnFetchItemsAction = { type: 'onFetchItems' };

    const newState = reducer(state, action);

    expect(newState.isFetchingItems).toBe(true);
  });

  it('should update state on "onFetchItemsSuccess" action', () => {
    const reducer = getReducer();
    const action: OnFetchItemsSuccessAction<UserContentCommonSchema> = {
      type: 'onFetchItemsSuccess',
      data: {
        response: {
          hits: [
            /* Array of items */
          ],
          total: 10,
        },
      },
    };

    const newState = reducer(state, action);

    expect(newState.isFetchingItems).toBe(false);
  });

  it('should update state on "onFetchItemsError" action', () => {
    const reducer = getReducer();
    const action: OnFetchItemsErrorAction = {
      type: 'onFetchItemsError' as const,
      data: { error: 'error' } as unknown as IHttpFetchError<Error>,
    };

    const newState = reducer(state, action);

    expect(newState.isFetchingItems).toBe(false);
    expect(newState.items).toEqual([]);
    expect(newState.totalItems).toBe(0);
    expect(newState.fetchError).toEqual(expect.objectContaining({ error: 'error' }));
  });

  it('should not update state if search query and ast clauses are unchanged', () => {
    const reducer = getReducer();
    const ast = Ast.create([]);
    const text = ``;
    const testQuery = new Query(ast, undefined, text);
    const action: OnSearchQueryChangeAction = {
      type: 'onSearchQueryChange',
      data: {
        text: 'Search query',
        query: testQuery,
      },
    };

    // Set the initial search query state to match the action data
    state.searchQuery = {
      text: 'Search query',
      query: testQuery,
    };

    const newState = reducer(state, action);

    expect(newState).toEqual(state);
  });

  it('should update state if search query or ast clauses are changed', () => {
    const reducer = getReducer();
    let ast = Ast.create([]);
    ast = ast.addOrFieldValue('tag', 'tag', true, 'eq');
    ast = ast.addOrFieldValue('tag', 'tag3', false, 'eq');
    const text = `tag:("tag") -tag:(tag3)`;
    const testQuery = new Query(ast, undefined, text);

    const action: OnSearchQueryChangeAction = {
      type: 'onSearchQueryChange',
      data: {
        text,
        query: testQuery,
      },
    };

    // Set the initial search query state to be different from the action data
    state.searchQuery = {
      text: 'Previous query',
      query: new Query(Ast.create([]), undefined, text),
    };

    const newState = reducer(state, action);

    expect(newState.isFetchingItems).toBe(true);
    expect(newState.searchQuery.text).toBe(text);
    expect(newState.searchQuery.query.ast.clauses[0]).toEqual({
      field: 'tag',
      match: 'must',
      operator: 'eq',
      type: 'field',
      value: ['tag'],
    });
    expect(newState.searchQuery.query.ast.clauses[1]).toEqual({
      field: 'tag',
      match: 'must_not',
      operator: 'eq',
      type: 'field',
      value: ['tag3'],
    });
  });

  it('should update state on "onTableChange" action', () => {
    const reducer = getReducer();
    const action: OnTableChangeAction<UserContentCommonSchema> = {
      type: 'onTableChange',
      data: {
        sort: {
          field: 'updatedAt',
          direction: 'desc',
        },
        page: {
          pageIndex: 2,
          pageSize: 20,
        },
      },
    };

    const newState = reducer(state, action);

    expect(newState.pagination.pageIndex).toBe(2);
    expect(newState.pagination.pageSize).toBe(20);
    expect(newState.tableSort.field).toBe('updatedAt');
    expect(newState.tableSort.direction).toBe('desc');
  });

  it('should update state on "showConfirmDeleteItemsModal" action', () => {
    const reducer = getReducer();
    const action: ShowConfirmDeleteItemsModalAction = { type: 'showConfirmDeleteItemsModal' };

    const newState = reducer(state, action);

    expect(newState.showDeleteModal).toBe(true);
  });

  it('should update state on "onDeleteItems" action', () => {
    const reducer = getReducer();
    const action: DeleteItemsActions = { type: 'onDeleteItems' };

    const newState = reducer(state, action);

    expect(newState.isDeletingItems).toBe(true);
  });

  it('should update state on "onCancelDeleteItems" action', () => {
    const reducer = getReducer();
    const action: DeleteItemsActions = { type: 'onCancelDeleteItems' };

    const newState = reducer(state, action);

    expect(newState.showDeleteModal).toBe(false);
  });

  it('should update state on "onItemsDeleted" action', () => {
    const reducer = getReducer();
    const action: DeleteItemsActions = { type: 'onItemsDeleted' };

    const newState = reducer(state, action);

    expect(newState.isDeletingItems).toBe(false);
    expect(newState.selectedIds).toEqual([]);
    expect(newState.showDeleteModal).toBe(false);
  });

  it('should update state on "onSelectionChange" action', () => {
    const reducer = getReducer();
    const action: OnSelectionChangeAction<UserContentCommonSchema> = {
      type: 'onSelectionChange',
      data: [{ id: '1' } as UserContentCommonSchema, { id: '2' } as UserContentCommonSchema],
    };

    const newState = reducer(state, action);

    expect(newState.selectedIds).toEqual(['1', '2']);
  });
});
