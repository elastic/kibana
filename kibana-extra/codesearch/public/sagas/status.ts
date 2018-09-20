/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action, createAction } from 'redux-actions';
import { delay } from 'redux-saga';
import { call, cancel, fork, put, select, take, takeEvery } from 'redux-saga/effects';
import { kfetch } from 'ui/kfetch';
import {
  loadRepoSuccess,
  loadStatus,
  loadStatusFailed,
  loadStatusSuccess,
} from '../actions/status';

const POLLING_INTERVAL = 5000;
const stopPollingStatus = createAction<string>('stop polling status');
function fetchStatus(repoUri: string) {
  return kfetch({ pathname: `../api/cs/repoCloneStatus/${repoUri}` });
}

function* handleLoadStatus(action: Action<string>) {
  try {
    const status = yield call(fetchStatus, action.payload);
    if (status.progress === 100) {
      yield put(stopPollingStatus(action.payload));
    }
    yield put(loadStatusSuccess({ status, repoUri: action.payload }));
  } catch (err) {
    yield put(loadStatusFailed(err));
  }
}

function* handleRepo(action: Action<any>) {
  if (action.payload) {
    yield put(loadStatus(action.payload.uri));
  }
}

export function* watchLoadRepoSuccess() {
  yield takeEvery(String(loadRepoSuccess), handleRepo);
}

function* pollingSaga(action) {
  while (true) {
    yield call(handleLoadStatus, action);
    yield delay(POLLING_INTERVAL);
  }
}

function* beginPolling(action) {
  const pollingTaskId = yield fork(pollingSaga, action);
  yield take(
    stopAction =>
      stopAction.type === String(stopPollingStatus) && stopAction.payload === action.payload
  );
  yield cancel(pollingTaskId);
}

export function* watchPollingStatus() {
  yield takeEvery(String(loadStatus), beginPolling);
}
