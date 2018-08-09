/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fork } from 'redux-saga/effects';

import { watchFetchRepoTree } from './file';
import { watchDeleteRepo, watchFetchRepos, watchImportRepo, watchIndexRepo } from './repository';
import { watchLocationChange } from './route';
import { watchSearchQueryChanged } from './search';

export function* rootSaga() {
  yield fork(watchFetchRepos);
  yield fork(watchLocationChange);
  yield fork(watchDeleteRepo);
  yield fork(watchIndexRepo);
  yield fork(watchImportRepo);
  yield fork(watchFetchRepoTree);
  yield fork(watchSearchQueryChanged);
}
