import { SubscriptionObserver } from '../observable';
import { Subject } from './subject';

/**
 * A SubjectWithCurrentValue is a Subject that has a _current_ value.
 *
 * Whenever an observer subscribes to a SubjectWithCurrentValue, it begins by
 * emitting the item most recently emitted by the source Observable (or a
 * seed/default value if none has yet been emitted) and then continues to emit
 * any other items emitted later by the source Observable(s).
 */
export class SubjectWithCurrentValue<T> extends Subject<T> {
  constructor(private _value: T) {
    super();
  }

  protected _registerObserver(observer: SubscriptionObserver<T>) {
    if (!this._isStopped) {
      observer.next(this._value);
    }
    return super._registerObserver(observer);
  }

  next(value: T) {
    if (!this._isStopped) {
      this._value = value;
    }
    return super.next(value);
  }
}
