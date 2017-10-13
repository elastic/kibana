import { Observable as RxObservable } from 'rxjs';

import { MonoTypeOperatorFunction } from '../interfaces';
import { rxjsToEsObservable } from '../lib';

/**
 * TODO docs
 * 
 * Some times we don't want to subscribe to the source observable multiple
 * times, e.g. when subscribing has side-effects or is expensive.
 */
export function shareLast<T>(): MonoTypeOperatorFunction<T> {
  return function shareLastOperation(source) {
    return rxjsToEsObservable(RxObservable.from(source).shareReplay(1));
  };
}
