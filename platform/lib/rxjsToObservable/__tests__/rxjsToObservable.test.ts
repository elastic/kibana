import { Observable } from 'rxjs';
import { rxjsToEsObservable } from '../';

describe('with rxjs observable transformed to ES observable', () => {
  it('passes through all values', () => {
    const observable = Observable.from([1, 2, 3]);
    const esObservable = rxjsToEsObservable(observable);

    const arr: number[] = [];
    esObservable.subscribe(val => {
      arr.push(val);
    });

    expect(arr).toEqual([1, 2, 3]);
  });

  it('handles completed', () => {
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

  it('handles error', () => {
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

  it('can transform to new rxjs observable', async () => {
    const observable = Observable.from([1, 2, 3]);
    const rxObservable = Observable.from(rxjsToEsObservable(observable));

    const arr = await rxObservable.toArray().toPromise();

    expect(arr).toEqual([1, 2, 3]);
  });
});
