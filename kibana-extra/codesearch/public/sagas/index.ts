/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fork, select, takeEvery } from 'redux-saga/effects';
import * as Selectors from '../selectors';

import { watchDeleteRepo, watchFetchRepos, watchImportRepo, watchIndexRepo } from './repository';
import { watchLocationChange } from './route';

function* handleIncrease(action: any) {
  const count = yield select(Selectors.getCounter);
  console.log('Side Effect of Increase From Saga: Current count is ' + count); // tslint:disable-line no-console
}

function* IncreaseWatcher() {
  yield takeEvery('INCREASE', handleIncrease);
}

function* handleDecrease(action: any) {
  const count = yield select(Selectors.getCounter);
  console.log('Side Effect of Decrease From Saga: Current count is ' + count); // tslint:disable-line no-console
}

function* DecreaseWatcher() {
  yield takeEvery('DECREASE', handleDecrease);
}

export function* rootSaga() {
  yield fork(IncreaseWatcher);
  yield fork(DecreaseWatcher);
  yield fork(watchFetchRepos);
  yield fork(watchLocationChange);
  yield fork(watchDeleteRepo);
  yield fork(watchIndexRepo);
  yield fork(watchImportRepo);
}
