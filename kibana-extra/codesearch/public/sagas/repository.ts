/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { call, put, takeEvery } from 'redux-saga/effects';
import { kfetch } from 'ui/kfetch';

import { Action } from 'redux-actions';
import {
  deleteRepo,
  deleteRepoFailed,
  deleteRepoSuccess,
  fetchRepos,
  fetchReposFailed,
  fetchReposSuccess,
  importRepo,
  importRepoFailed,
  importRepoSuccess,
  indexRepo,
  indexRepoFailed,
  indexRepoSuccess,
} from '../actions';

function requestRepos(): any {
  return kfetch({ pathname: '../api/cs/repos' });
}

function* handleFetchRepos() {
  try {
    const repos = yield call(requestRepos);
    yield put(fetchReposSuccess(repos));
  } catch (err) {
    yield put(fetchReposFailed(err));
  }
}

function requestDeleteRepo(uri: string) {
  return kfetch({ pathname: `../api/cs/repo/${uri}`, method: 'delete' });
}

function requestIndexRepo(uri: string) {
  return kfetch({ pathname: `../api/cs/repo/index/${uri}`, method: 'post' });
}

function* handleDeleteRepo(action: Action<string>) {
  try {
    yield call(requestDeleteRepo, action.payload || '');
    yield put(deleteRepoSuccess(action.payload || ''));
  } catch (err) {
    yield put(deleteRepoFailed(err));
  }
}

function* handleIndexRepo(action: Action<string>) {
  try {
    yield call(requestIndexRepo, action.payload || '');
    yield put(indexRepoSuccess(action.payload || ''));
  } catch (err) {
    yield put(indexRepoFailed(err));
  }
}

function requestImportRepo(uri: string) {
  return kfetch({ pathname: '../api/cs/repo', method: 'post', body: JSON.stringify({ url: uri }) });
}

function* handleImportRepo(action: Action<string>) {
  try {
    const data = yield call(requestImportRepo, action.payload || '');
    yield put(importRepoSuccess(data));
  } catch (err) {
    yield put(importRepoFailed(err));
  }
}

export function* watchImportRepo() {
  yield takeEvery(String(importRepo), handleImportRepo);
}

export function* watchDeleteRepo() {
  yield takeEvery(String(deleteRepo), handleDeleteRepo);
}

export function* watchIndexRepo() {
  yield takeEvery(String(indexRepo), handleIndexRepo);
}

export function* watchFetchRepos() {
  yield takeEvery(String(fetchRepos), handleFetchRepos);
}
