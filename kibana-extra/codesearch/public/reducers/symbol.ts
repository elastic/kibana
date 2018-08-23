/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import produce from 'immer';
import { Action, handleActions } from 'redux-actions';

import { SymbolInformation } from 'vscode-languageserver-types';
import { loadStructure, loadStructureFailed, loadStructureSuccess } from '../actions';

export interface SymbolState {
  symbols: { [key: string]: SymbolInformation[] };
  error?: Error;
  loading: boolean;
  lastRequestPath?: string;
}

const initialState: SymbolState = {
  symbols: {},
  loading: false,
};

export const symbol = handleActions(
  {
    [String(loadStructure)]: (state: SymbolState, action: Action<any>) =>
      produce<SymbolState>(state, draft => {
        draft.loading = true;
        draft.lastRequestPath = action.payload || '';
      }),
    [String(loadStructureSuccess)]: (state: SymbolState, action: Action<SymbolInformation[]>) =>
      produce<SymbolState>(state, draft => {
        draft.loading = false;
        const { path, data } = action.payload;
        draft.symbols = {
          ...state.symbols,
          [path]: data,
        };
      }),
    [String(loadStructureFailed)]: (state: SymbolState, action: Action<any>) => {
      if (action.payload) {
        return produce<SymbolState>(state, draft => {
          draft.loading = false;
          draft.error = action.payload;
        });
      } else {
        return state;
      }
    },
  },
  initialState
);
