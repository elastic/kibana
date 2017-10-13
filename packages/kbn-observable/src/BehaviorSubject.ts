import { SubscriptionObserver } from './Observable';
import { Subject } from './Subject';

/**
 * TODO link to Subject, then explain what a BehaviorSubject is.
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

  getValue() {
    if (this.thrownError !== undefined) {
      throw this.thrownError;
    }

    return this.value;
  }

  next(value: T) {
    this.value = value;
    return super.next(value);
  }
}
