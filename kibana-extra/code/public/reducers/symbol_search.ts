/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { DetailSymbolInformation } from '@code/lsp-extension';
import produce from 'immer';
import { Action, handleActions } from 'redux-actions';

import { symbolSearchFailed, symbolSearchQueryChanged, symbolSearchSuccess } from '../actions';

const MAX_SYMBOLS_NUM = 5;

export interface SymbolSearchState {
  query: string;
  isLoading: boolean;
  error?: Error;
  symbols: DetailSymbolInformation[];
}

const initialState: SymbolSearchState = {
  query: '',
  isLoading: false,
  symbols: [],
};

export const symbolSearch = handleActions(
  {
    [String(symbolSearchQueryChanged)]: (state: SymbolSearchState, action: Action<any>) =>
      produce<SymbolSearchState>(state, draft => {
        draft.query = action.payload;
        draft.isLoading = true;
      }),
    [String(symbolSearchSuccess)]: (state: SymbolSearchState, action: Action<any>) =>
      produce<SymbolSearchState>(state, draft => {
        draft.symbols = action.payload.symbols.slice(0, MAX_SYMBOLS_NUM);
        draft.isLoading = false;
      }),
    [String(symbolSearchFailed)]: (state: SymbolSearchState, action: Action<any>) => {
      if (action.payload) {
        return produce<SymbolSearchState>(state, draft => {
          draft.error = action.payload;
          draft.isLoading = false;
        });
      } else {
        return state;
      }
    },
  },
  initialState
);
