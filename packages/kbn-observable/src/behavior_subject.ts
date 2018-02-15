import { SubscriptionObserver } from './Observable';
import { Subject } from './Subject';

/**
 * A BehaviorSubject is a Subject that has a _current_ value.
 *
 * Whenever an observer subscribes to a BehaviorSubject, it begins by emitting
 * the item most recently emitted by the source Observable (or a seed/default
 * value if none has yet been emitted) and then continues to emit any other
 * items emitted later by the source Observable(s).
 */
export class BehaviorSubject<T> extends Subject<T> {
  constructor(private value: T) {
    super();
  }

  protected registerObserver(observer: SubscriptionObserver<T>) {
    if (!this.isStopped) {
      observer.next(this.value);
    }
    return super.registerObserver(observer);
  }

  /**
   * @returns The current value of the BehaviorSubject. Most of the time this
   * shouldn't be used directly, but there are situations were it can come in
   * handy. Usually a BehaviorSubject is used so you immediately receive the
   * latest/current value when subscribing.
   */
  getValue() {
    if (this.thrownError !== undefined) {
      throw this.thrownError;
    }

    return this.value;
  }

  next(value: T) {
    if (!this.isStopped) {
      this.value = value;
    }
    return super.next(value);
  }
}
