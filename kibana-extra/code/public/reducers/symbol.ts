/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import produce from 'immer';
import { Action, handleActions } from 'redux-actions';

import { Location, SymbolInformation } from 'vscode-languageserver-types/lib/esm/main';
import { loadStructure, loadStructureFailed, loadStructureSuccess } from '../actions';

export interface SymbolWithMembers extends SymbolInformation {
  members?: Set<SymbolInformation>;
}
export interface SymbolState {
  symbols: { [key: string]: SymbolInformation[] };
  structureTree: { [key: string]: SymbolWithMembers[] };
  error?: Error;
  loading: boolean;
  lastRequestPath?: string;
}

const initialState: SymbolState = {
  symbols: {},
  loading: false,
  structureTree: {},
};

const generateStructureTree: (symbols: SymbolInformation[]) => any = symbols => {
  const structureTree: SymbolWithMembers[] = [];

  function isOneLocationAfterAnotherLocation(oneLocation: Location, anotherLocation: Location) {
    const {
      line: oneLocationStartLine,
      character: oneLocationStartCharacter,
    } = oneLocation.range.start;
    const {
      line: anotherLocationEndLine,
      character: anotherLocationEndCharacter,
    } = anotherLocation.range.end;
    return (
      oneLocationStartLine > anotherLocationEndLine ||
      (oneLocationStartLine === anotherLocationEndLine &&
        oneLocationStartCharacter >= anotherLocationEndCharacter)
    );
  }

  function findContainer(containerName: string, location: Location): SymbolInformation | undefined {
    return symbols.find(
      (s: SymbolInformation) =>
        s.name === containerName && isOneLocationAfterAnotherLocation(location, s.location)
    );
  }

  symbols.forEach((s: SymbolInformation) => {
    const container = findContainer(s.containerName, s.location);
    if (container) {
      if (container.members) {
        container.members.add(s);
      } else {
        container.members = new Set([s]);
      }
    } else {
      structureTree.push(s);
    }
  });

  return structureTree;
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
        draft.structureTree[path] = generateStructureTree(data);
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
