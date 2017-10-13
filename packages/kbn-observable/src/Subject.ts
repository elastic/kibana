import { Observable, SubscriptionObserver } from './Observable';

/**
 * A Subject is a special type of Observable that allows values to be
 * multicasted to many Observers. While plain Observables are unicast (each
 * subscribed Observer owns an independent execution of the Observable),
 * Subjects are multicast.
 *
 * A Subject is like an Observable, but can multicast to many Observers.
 * Subjects are like EventEmitters: they maintain a registry of many listeners.
 *
 * Every Subject is an Observable. Given a Subject, you can subscribe to it,
 * providing an Observer, which will start receiving values normally. From the
 * perspective of the Observer, it cannot tell whether the Observable execution
 * is coming from a plain unicast Observable or a Subject.
 *
 * Internally to the Subject, `subscribe` does not invoke a new execution that
 * delivers values. It simply registers the given Observer in a list of
 * Observers, similarly to how `addListener` usually works in other libraries
 * and languages.
 *
 * Every Subject is an Observer. It is an object with the methods `next(v)`,
 * `error(e)`, and `complete()`. To feed a new value to the Subject, just call
 * `next(theValue)`, and it will be multicasted to the Observers registered to
 * listen to the Subject.
 */
export class Subject<T> extends Observable<T> {
  protected observers: Set<SubscriptionObserver<T>> = new Set();
  protected isStopped = false;
  protected thrownError?: Error;

  constructor() {
    super(observer => this.registerObserver(observer));
  }

  protected registerObserver(observer: SubscriptionObserver<T>) {
    if (this.isStopped) {
      if (this.thrownError !== undefined) {
        observer.error(this.thrownError);
      } else {
        observer.complete();
      }
    } else {
      this.observers.add(observer);
      return () => this.observers.delete(observer);
    }
  }

  /**
   * @param value The value that will be forwarded to every observer subscribed
   * to this subject.
   */
  next(value: T) {
    for (const observer of this.observers) {
      observer.next(value);
    }
  }

  /**
   * @param error The error that will be forwarded to every observer subscribed
   * to this subject.
   */
  error(error: Error) {
    this.thrownError = error;
    this.isStopped = true;

    for (const observer of this.observers) {
      observer.error(error);
    }

    this.observers.clear();
  }

  /**
   * Completes all the subscribed observers, then clears the list of observers.
   */
  complete() {
    this.isStopped = true;

    for (const observer of this.observers) {
      observer.complete();
    }

    this.observers.clear();
  }

  /**
   * Returns an observable, so the observer methods are hidden.
   */
  asObservable(): Observable<T> {
    return new Observable(observer => this.subscribe(observer));
  }
}
