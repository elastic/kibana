/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
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
    [String(loadStructure)]: (state: SymbolState, action: Action<string>) => {
      return {
        ...state,
        loading: true,
        lastRequestPath: action.payload || '',
      };
    },
    [String(loadStructureSuccess)]: (state: SymbolState, action: Action<SymbolInformation[]>) => {
      return {
        ...state,
        symbols: {
          ...state.symbols,
          [action.payload.path]: action.payload.data!,
        },
        loading: false,
      };
    },
    [String(loadStructureFailed)]: (state: SymbolState, action: Action<any>) => {
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
  },
  initialState
);
