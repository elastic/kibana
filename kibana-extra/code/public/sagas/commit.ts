/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Action } from 'redux-actions';
import { call, put, takeEvery } from 'redux-saga/effects';
import { kfetch } from 'ui/kfetch';
import { routeChange } from '../actions';
import { loadCommit, loadCommitFailed, loadCommitSuccess } from '../actions';

function requestCommit(repo: string, commitId: string) {
  return kfetch({
    pathname: `../api/cs/repo/${repo}/diff/${commitId}`,
  });
}

function* handleLoadCommit(action: Action<any>) {
  try {
    const { commitId, resource, org, repo } = action.payload.params;
    yield put(loadCommit(commitId));
    const repoUri = `${resource}/${org}/${repo}`;
    const commit = yield call(requestCommit, repoUri, commitId);
    yield put(loadCommitSuccess(commit));
  } catch (err) {
    yield put(loadCommitFailed(err));
  }
}

export function* watchLoadCommit() {
  yield takeEvery(String(routeChange), handleLoadCommit);
}
