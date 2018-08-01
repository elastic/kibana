/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Action, handleActions } from 'redux-actions';

import { Repository } from '../../model';

import {
  deleteRepoSuccess,
  fetchRepos,
  fetchReposFailed,
  fetchReposSuccess,
  importRepo,
  importRepoFailed,
  importRepoSuccess,
} from '../actions';

export interface RepositoryState {
  repositories: Repository[];
  error?: Error;
  loading: boolean;
  importLoading: boolean;
}

const initialState: RepositoryState = {
  repositories: [],
  loading: false,
  importLoading: false,
};

export const repository = handleActions(
  {
    [String(fetchRepos)]: (state: RepositoryState) => {
      return {
        ...state,
        loading: true,
      };
    },
    [String(fetchReposSuccess)]: (state: RepositoryState, action: Action<Repository[]>) => {
      return {
        ...state,
        repositories: action.payload || [],
        loading: false,
      };
    },
    [String(fetchReposFailed)]: (state: RepositoryState, action: Action<any>) => {
      if (action.payload) {
        return {
          ...state,
          error: action.payload,
          loading: false,
        };
      } else {
        return state;
      }
    },
    [String(deleteRepoSuccess)]: (state: RepositoryState, action: Action<any>) => {
      return {
        ...state,
        repositories: state.repositories.filter(repo => repo.uri !== action.payload),
      };
    },
    [String(importRepo)]: (state: RepositoryState) => {
      return {
        ...state,
        importLoading: true,
      };
    },
    [String(importRepoSuccess)]: (state: RepositoryState, action: Action<any>) => {
      return {
        ...state,
        repositories: [...state.repositories, action.payload],
        importLoading: false,
      };
    },
    [String(importRepoFailed)]: (state: RepositoryState) => {
      return {
        ...state,
        importLoading: false,
      };
    },
  },
  initialState
);
