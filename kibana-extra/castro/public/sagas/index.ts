import { fork, takeEvery, select } from 'redux-saga/effects';
import * as CastroSelectors from '../selectors';

function* handleIncrease(action: any) {
  const count = yield select(CastroSelectors.getCounter);
  console.log("Side Effect of Increase From Saga: Current count is " + count);
}

function* IncreaseWatcher() {
  yield takeEvery('INCREASE', handleIncrease);
}

function* handleDecrease(action: any) {
  const count = yield select(CastroSelectors.getCounter);
  console.log("Side Effect of Decrease From Saga: Current count is " + count);
}

function* DecreaseWatcher() {
  yield takeEvery('DECREASE', handleDecrease);
}

export function* rootSaga() {
  yield fork(IncreaseWatcher);
  yield fork(DecreaseWatcher);
}