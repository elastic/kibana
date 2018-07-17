/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fork, select, takeEvery } from 'redux-saga/effects';
import * as CastroSelectors from '../selectors';

function* handleIncrease(action: any) {
  const count = yield select(CastroSelectors.getCounter);
  console.log('Side Effect of Increase From Saga: Current count is ' + count); // tslint:disable-line no-console
}

function* IncreaseWatcher() {
  yield takeEvery('INCREASE', handleIncrease);
}

function* handleDecrease(action: any) {
  const count = yield select(CastroSelectors.getCounter);
  console.log('Side Effect of Decrease From Saga: Current count is ' + count); // tslint:disable-line no-console
}

function* DecreaseWatcher() {
  yield takeEvery('DECREASE', handleDecrease);
}

export function* rootSaga() {
  yield fork(IncreaseWatcher);
  yield fork(DecreaseWatcher);
}
