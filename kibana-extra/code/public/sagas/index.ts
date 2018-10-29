/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fork } from 'redux-saga/effects';

import { watchLoadCommit } from './commit';
import { watchDocumentSearch } from './document_search';
import { watchCloseReference, watchLspMethods } from './editor';
import { watchFetchBranchesAndCommits, watchFetchRepoTree } from './file';
import {
  watchDeleteRepo,
  watchFetchRepoConfigs,
  watchFetchRepos,
  watchGotoRepo,
  watchImportRepo,
  watchIndexRepo,
  watchInitRepoCmd,
} from './repository';
import { watchLoadRepo, watchLocationChange } from './route';
import { watchLoadStructure } from './structure';
import { watchSymbolSearchQueryChanged } from './symbol_search';
import { watchLoadUserConfig } from './user';

export function* rootSaga() {
  yield fork(watchFetchRepos);
  yield fork(watchLocationChange);
  yield fork(watchDeleteRepo);
  yield fork(watchIndexRepo);
  yield fork(watchImportRepo);
  yield fork(watchFetchRepoTree);
  yield fork(watchFetchBranchesAndCommits);
  yield fork(watchSymbolSearchQueryChanged);
  yield fork(watchDocumentSearch);
  yield fork(watchLoadStructure);
  yield fork(watchLspMethods);
  yield fork(watchCloseReference);
  yield fork(watchFetchRepoConfigs);
  yield fork(watchInitRepoCmd);
  yield fork(watchGotoRepo);
  yield fork(watchLoadRepo);
  yield fork(watchLoadUserConfig);
  yield fork(watchLoadCommit);
}
