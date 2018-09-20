/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { combineReducers } from 'redux';

import { documentSearch, DocumentSearchState } from './document_search';
import { editor, EditorState } from './editor';
import { file, FileState } from './file';
import { repository, RepositoryState } from './repository';
import { route, RouteState } from './route';
import { symbol, SymbolState } from './symbol';
import { symbolSearch, SymbolSearchState } from './symbol_search';
export interface RootState {
  repository: RepositoryState;
  symbolSearch: SymbolSearchState;
  documentSearch: DocumentSearchState;
  file: FileState;
  symbol: SymbolState;
  editor: EditorState;
  route: RouteState;
}

export const rootReducer = combineReducers({
  repository,
  file,
  symbol,
  editor,
  documentSearch,
  symbolSearch,
  route,
});
