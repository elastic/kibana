/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fork } from 'redux-saga/effects';

import { watchBlame, watchLoadBlame } from './blame';
import { watchLoadCommit } from './commit';
import { watchDocumentSearch, watchSearchRouteChange } from './document_search';
import {
  watchCloseReference,
  watchLoadRepo,
  watchLspMethods,
  watchMainRouteChange,
} from './editor';
import { watchFetchBranchesAndCommits, watchFetchRepoTree, watchRepoRouteChange } from './file';
import {
  watchAdminRouteChange,
  watchDeleteRepo,
  watchFetchRepoConfigs,
  watchFetchRepos,
  watchGotoRepo,
  watchImportRepo,
  watchIndexRepo,
  watchInitRepoCmd,
} from './repository';
import { watchRepositorySearch } from './repository_search';
import { watchRepoCloneSuccess } from './status';
import { watchLoadStructure } from './structure';
import { watchLoadUserConfig } from './user';

export function* rootSaga() {
  yield fork(watchFetchRepos);
  yield fork(watchDeleteRepo);
  yield fork(watchIndexRepo);
  yield fork(watchImportRepo);
  yield fork(watchFetchRepoTree);
  yield fork(watchFetchBranchesAndCommits);
  yield fork(watchDocumentSearch);
  yield fork(watchRepositorySearch);
  yield fork(watchLoadStructure);
  yield fork(watchLspMethods);
  yield fork(watchCloseReference);
  yield fork(watchFetchRepoConfigs);
  yield fork(watchInitRepoCmd);
  yield fork(watchGotoRepo);
  yield fork(watchLoadRepo);
  yield fork(watchLoadUserConfig);
  yield fork(watchLoadCommit);
  yield fork(watchSearchRouteChange);
  yield fork(watchAdminRouteChange);
  yield fork(watchMainRouteChange);
  yield fork(watchLoadRepo);
  yield fork(watchRepoRouteChange);
  yield fork(watchLoadBlame);
  yield fork(watchBlame);
  yield fork(watchRepoCloneSuccess);
}
