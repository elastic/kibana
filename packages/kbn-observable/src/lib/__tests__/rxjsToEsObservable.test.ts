import { Observable } from 'rxjs';
import { rxjsToEsObservable } from '../';

test('passes through all values', () => {
  const observable = Observable.from([1, 2, 3]);
  const esObservable = rxjsToEsObservable(observable);

  const arr: number[] = [];
  esObservable.subscribe(val => {
    arr.push(val);
  });

  expect(arr).toEqual([1, 2, 3]);
});

test('handles completed', () => {
  const observable = Observable.empty();
  const esObservable = rxjsToEsObservable(observable);

  let completed = false;
  esObservable.subscribe({
    complete: () => {
      completed = true;
    }
  });

  expect(completed).toBe(true);
});

test('handles error', () => {
  const err = new Error('err');
  const observable = Observable.throw(err);

  const esObservable = rxjsToEsObservable(observable);

  let receivedError = undefined;
  esObservable.subscribe({
    error: err => {
      receivedError = err;
    }
  });

  expect(receivedError).toBe(err);
});

test('can transform to new rxjs observable', async () => {
  const observable = Observable.from([1, 2, 3]);
  const rxObservable = Observable.from(rxjsToEsObservable(observable));

  const arr = await rxObservable.toArray().toPromise();

  expect(arr).toEqual([1, 2, 3]);
});
