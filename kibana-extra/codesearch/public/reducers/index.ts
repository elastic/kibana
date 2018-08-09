/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { combineReducers } from 'redux';

import { file, FileState } from './file';
import { repository, RepositoryState } from './repository';
import { search, SearchState } from './search';

export interface RootState {
  repository: RepositoryState;
  search: SearchState;
  file: FileState;
}

export const rootReducer = combineReducers({ repository, search, file });
