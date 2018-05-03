import { Observable, SubscriptionObserver } from '../observable';

/**
 * A Subject is a special type of Observable that allows values to be
 * multicasted to many Observers. While plain Observables are unicast (each
 * subscribed Observer owns an independent execution of the Observable),
 * Subjects are multicast.
 *
 * Every Subject is an Observable. Given a Subject, you can subscribe to it in
 * the same way you subscribe to any Observable, and you will start receiving
 * values normally. From the perspective of the Observer, it cannot tell whether
 * the Observable execution is coming from a plain unicast Observable or a
 * Subject.
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
 *
 * Learn more about Subjects:
 * - http://reactivex.io/documentation/subject.html
 * - http://davesexton.com/blog/post/To-Use-Subject-Or-Not-To-Use-Subject.aspx
 */
export class Subject<T> extends Observable<T> {
  protected _observers: Set<SubscriptionObserver<T>> = new Set();
  protected _isStopped = false;
  protected _thrownError?: Error;

  constructor() {
    super(observer => this._registerObserver(observer));
  }

  protected _registerObserver(observer: SubscriptionObserver<T>) {
    if (this._isStopped) {
      if (this._thrownError !== undefined) {
        observer.error(this._thrownError);
      } else {
        observer.complete();
      }
    } else {
      this._observers.add(observer);
      return () => this._observers.delete(observer);
    }
  }

  /**
   * @param value The value that will be forwarded to every observer subscribed
   * to this subject.
   */
  next(value: T) {
    if (this._isStopped) return;

    for (const observer of this._observers) {
      observer.next(value);
    }
  }

  /**
   * @param error The error that will be forwarded to every observer subscribed
   * to this subject.
   */
  error(error: Error) {
    if (this._isStopped) return;

    this._thrownError = error;
    this._isStopped = true;

    for (const observer of this._observers) {
      observer.error(error);
    }

    this._observers.clear();
  }

  /**
   * Completes all the subscribed observers, then clears the list of observers.
   */
  complete() {
    if (this._isStopped) return;

    this._isStopped = true;

    for (const observer of this._observers) {
      observer.complete();
    }

    this._observers.clear();
  }

  /**
   * Returns an observable, so the observer methods are hidden.
   */
  asObservable(): Observable<T> {
    return new Observable(observer => this.subscribe(observer));
  }
}
