/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { DetailSymbolInformation } from '@codesearch/lsp-extension';
import { Action, handleActions } from 'redux-actions';

import { searchFailed, searchQueryChanged, searchSuccess } from '../actions';

const MAX_SYMBOLS_NUM = 5;

export interface SearchState {
  query: string;
  isLoading: boolean;
  error?: Error;
  symbols: DetailSymbolInformation[];
}

const initialState: SearchState = {
  query: '',
  isLoading: false,
  symbols: [],
};

export const search = handleActions(
  {
    [String(searchQueryChanged)]: (state: SearchState, action: Action<any>) => {
      return {
        ...state,
        query: action.payload,
        isLoading: true,
      };
    },
    [String(searchSuccess)]: (state: SearchState, action: Action<any>) => {
      return {
        ...state,
        symbols: action.payload.symbols.slice(0, MAX_SYMBOLS_NUM),
        isLoading: false,
      };
    },
    [String(searchFailed)]: (state: SearchState, action: Action<any>) => {
      if (action.payload) {
        return {
          ...state,
          error: action.payload,
          isLoading: false,
        };
      } else {
        return state;
      }
    },
  },
  initialState
);
