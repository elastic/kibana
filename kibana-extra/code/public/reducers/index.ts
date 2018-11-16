/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { combineReducers } from 'redux';

import { blame, BlameState } from './blame';
import { commit, CommitState } from './commit';
import { documentSearch, DocumentSearchState } from './document_search';
import { editor, EditorState } from './editor';
import { file, FileState } from './file';
import { repository, RepositoryState } from './repository';
import { repositorySearch, RepositorySearchState } from './repository_search';
import { route, RouteState } from './route';
import { status, StatusState } from './status';
import { symbol, SymbolState } from './symbol';
import { symbolSearch, SymbolSearchState } from './symbol_search';
import { userConfig, UserConfigState } from './user';
export interface RootState {
  repository: RepositoryState;
  symbolSearch: SymbolSearchState;
  documentSearch: DocumentSearchState;
  repositorySearch: RepositorySearchState;
  file: FileState;
  symbol: SymbolState;
  editor: EditorState;
  route: RouteState;
  status: StatusState;
  userConfig: UserConfigState;
  commit: CommitState;
  blame: BlameState;
}

export const rootReducer = combineReducers({
  repository,
  file,
  symbol,
  editor,
  documentSearch,
  repositorySearch,
  symbolSearch,
  route,
  status,
  userConfig,
  commit,
  blame,
});
