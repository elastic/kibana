import symbolObservable from 'symbol-observable';

import { OperatorFunction } from './interfaces';
import { pipeFromArray } from './lib';

const noop = () => {};

// This adds a symbol type for `Symbol.observable`, which doesn't exist globally
// in TypeScript yet.
declare global {
  export interface SymbolConstructor {
    readonly observable: symbol;
  }
}

/**
 * An Observer is used to receive data from an Observable, and is supplied as an
 * argument to subscribe.
 */
export interface Observer<T> {
  // Receives the next value in the sequence
  next(value: T): void;

  // Receives the sequence error
  error(errorValue: Error): void;

  // Receives a completion notification
  complete(): void;
}

export type PartialObserver<T> = Partial<Observer<T>>;

export type UnsubscribeFunction = () => void;

export type SubscriptionTeardown = Subscription | UnsubscribeFunction | void;

export class Subscription {
  private _observer?: PartialObserver<any>;
  private readonly _cancelSubscription: UnsubscribeFunction = noop;

  constructor(
    observer: PartialObserver<any>,
    onSubscribe: SubscriberFunction<any>
  ) {
    const subscriptionObserver = new SubscriptionObserver(observer, this);
    let cleanup: SubscriptionTeardown;

    this._observer = observer;

    try {
      cleanup = onSubscribe(subscriptionObserver);
    } catch (e) {
      observer.error && observer.error(e);
      this._observer = undefined;
      return;
    }

    if (cleanup === undefined) {
      cleanup = noop;
    }

    if (typeof cleanup !== 'function') {
      if (
        typeof cleanup !== 'object' ||
        typeof cleanup.unsubscribe !== 'function'
      ) {
        throw new TypeError(
          `cleanup must be a function or a subscription, found ${cleanup}`
        );
      }

      const subscription = cleanup;
      cleanup = () => {
        subscription.unsubscribe();
      };
    }

    this._cancelSubscription = cleanup;

    // If the stream is already finished, then perform cleanup
    if (this.closed) {
      cleanup();
    }
  }

  /**
   * A boolean value indicating whether the subscription is closed
   */
  get closed() {
    return this._observer === undefined;
  }

  /**
   * Cancel the subscription
   */
  unsubscribe() {
    if (!this.closed) {
      this._cancelSubscription();
      this._observer = undefined;
    }
  }
}

/**
 * A `SubscriptionObserver` is a normalized Observer which wraps an observer and
 * a subscription.
 */
export class SubscriptionObserver<T> {
  /**
   * A boolean value indicating whether the subscription is closed
   */
  get closed() {
    return this._subscription.closed;
  }

  constructor(
    private readonly _observer: PartialObserver<T>,
    private readonly _subscription: Subscription
  ) {}
  /**
   * Sends the next value in the sequence
   */
  next(value: T) {
    if (!this.closed) {
      try {
        this._observer.next && this._observer.next(value);
      } catch (e) {
        console.error(e);
      }
    }
  }

  /**
   * Sends the sequence error
   */
  error(errorValue: Error) {
    if (!this.closed) {
      try {
        this._observer.error && this._observer.error(errorValue);
      } catch (e) {
        console.error(e);
      }
      this._subscription.unsubscribe();
    }
  }

  /**
   * Sends the completion notification
   */
  complete() {
    if (!this.closed) {
      try {
        this._observer.complete && this._observer.complete();
      } catch (e) {
        console.error(e);
      }
      this._subscription.unsubscribe();
    }
  }
}

export type SubscriberFunction<T> = (
  observer: SubscriptionObserver<T>
) => SubscriptionTeardown;

export interface Subscribable<T> {
  subscribe(
    observerOrNext?: SubscriptionObserver<T> | ((value: T) => void)
  ): Subscription;
}

export class Observable<T> implements Subscribable<T> {
  constructor(onSubscribe: SubscriberFunction<T>);
  constructor(private readonly _onSubscribe: SubscriberFunction<T>) {
    if (typeof _onSubscribe !== 'function') {
      throw new TypeError('`_onSubscribe` must be a function');
    }
  }

  subscribe(
    observerOrNext?: PartialObserver<T> | ((value: T) => void)
  ): Subscription;
  /**
   * Invokes an execution of an Observable and registers Observer handlers for
   * notifications it will emit.
   *
   * `subscribe` is not a regular operator, but a method that calls Observable's
   * internal `subscribe` function. It might be for example a function that you
   * passed to `new Observable`, but most of the time it is a library
   * implementation, which defines what and when will be emitted by an
   * Observable. This means that calling `subscribe` is actually the moment when
   * Observable starts its work, not when it is created, as it is often thought.
   *
   * Apart from starting the execution of an Observable, this method allows you
   * to listen for values that an Observable emits, as well as for when it
   * completes or errors. You can achieve this in two following ways:
   *
   * The first way is creating an object that implements {@link Observer} interface. It should have methods
   * defined by that interface, but note that it should be just a regular JavaScript object, which you can create
   * yourself in any way you want (ES6 class, classic function constructor, object literal etc.). In particular do
   * not attempt to use any RxJS implementation details to create Observers - you don't need them. Remember also
   * that your object does not have to implement all methods. If you find yourself creating a method that doesn't
   * do anything, you can simply omit it. Note however, that if `error` method is not provided, all errors will
   * be left uncaught.
   *
   * The second way is to give up on Observer object altogether and simply provide callback functions in place of its methods.
   * This means you can provide three functions as arguments to `subscribe`, where first function is equivalent
   * of a `next` method, second of an `error` method and third of a `complete` method. Just as in case of Observer,
   * if you do not need to listen for something, you can omit a function, preferably by passing `undefined` or `null`,
   * since `subscribe` recognizes these functions by where they were placed in function call. When it comes
   * to `error` function, just as before, if not provided, errors emitted by an Observable will be thrown.
   *
   * Whatever style of calling `subscribe` you use, in both cases it returns a Subscription object.
   * This object allows you to call `unsubscribe` on it, which in turn will stop work that an Observable does and will clean
   * up all resources that an Observable used. Note that cancelling a subscription will not call `complete` callback
   * provided to `subscribe` function, which is reserved for a regular completion signal that comes from an Observable.
   *
   * Remember that callbacks provided to `subscribe` are not guaranteed to be called asynchronously.
   * It is an Observable itself that decides when these functions will be called. For example {@link of}
   * by default emits all its values synchronously. Always check documentation for how given Observable
   * will behave when subscribed and if its default behavior can be modified with a {@link Scheduler}.
   *
   * @example <caption>Subscribe with an Observer</caption>
   * const sumObserver = {
   *   sum: 0,
   *   next(value) {
   *     console.log('Adding: ' + value);
   *     this.sum = this.sum + value;
   *   },
   *   error() { // We actually could just remove this method,
   *   },        // since we do not really care about errors right now.
   *   complete() {
   *     console.log('Sum equals: ' + this.sum);
   *   }
   * };
   *
   * Rx.Observable.of(1, 2, 3) // Synchronously emits 1, 2, 3 and then completes.
   * .subscribe(sumObserver);
   *
   * // Logs:
   * // "Adding: 1"
   * // "Adding: 2"
   * // "Adding: 3"
   * // "Sum equals: 6"
   *
   *
   * @example <caption>Subscribe with functions</caption>
   * let sum = 0;
   *
   * Rx.Observable.of(1, 2, 3)
   * .subscribe(
   *   function(value) {
   *     console.log('Adding: ' + value);
   *     sum = sum + value;
   *   }
   * );
   *
   * // Logs:
   * // "Adding: 1"
   * // "Adding: 2"
   * // "Adding: 3"
   *
   *
   * @example <caption>Cancel a subscription</caption>
   * const subscription = Rx.Observable.interval(1000).subscribe(
   *   num => console.log(num),
   *   undefined,
   *   () => console.log('completed!') // Will not be called, even
   * );                                // when cancelling subscription
   *
   *
   * setTimeout(() => {
   *   subscription.unsubscribe();
   *   console.log('unsubscribed!');
   * }, 2500);
   *
   * // Logs:
   * // 0 after 1s
   * // 1 after 2s
   * // "unsubscribed!" after 2.5s
   *
   *
   * @param {Observer|Function} observerOrNext (optional) Either an observer with methods to be called,
   *  or the first of three possible handlers, which is the handler for each value emitted from the subscribed
   *  Observable.
   * @return {Subscription} a subscription reference to the registered handlers
   * @method subscribe
   */
  subscribe(
    observerOrNext: PartialObserver<T> | ((value: T) => void) = {},
    ...rest: never[]
  ) {
    if (rest.length > 0) {
      throw new TypeError(
        'Specifying multiple arguments to "subscribe" is not allowed. If you ' +
          'want to specify "error" or "complete" handler, pass in an object ' +
          'instead.'
      );
    }

    const observer: PartialObserver<T> =
      typeof observerOrNext === 'function'
        ? { next: observerOrNext }
        : observerOrNext;

    return new Subscription(observer, this._onSubscribe);
  }

  pipe(): Observable<T>;
  pipe<A>(op1: OperatorFunction<T, A>): Observable<A>;
  pipe<A, B>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>
  ): Observable<B>;
  pipe<A, B, C>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>
  ): Observable<C>;
  pipe<A, B, C, D>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>
  ): Observable<D>;
  pipe<A, B, C, D, E>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>,
    op5: OperatorFunction<D, E>
  ): Observable<E>;
  pipe<A, B, C, D, E, F>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>,
    op5: OperatorFunction<D, E>,
    op6: OperatorFunction<E, F>
  ): Observable<F>;
  pipe<A, B, C, D, E, F, G>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>,
    op5: OperatorFunction<D, E>,
    op6: OperatorFunction<E, F>,
    op7: OperatorFunction<F, G>
  ): Observable<G>;
  pipe<A, B, C, D, E, F, G, H>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>,
    op5: OperatorFunction<D, E>,
    op6: OperatorFunction<E, F>,
    op7: OperatorFunction<F, G>,
    op8: OperatorFunction<G, H>
  ): Observable<H>;
  pipe<A, B, C, D, E, F, G, H, I>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>,
    op5: OperatorFunction<D, E>,
    op6: OperatorFunction<E, F>,
    op7: OperatorFunction<F, G>,
    op8: OperatorFunction<G, H>,
    op9: OperatorFunction<H, I>
  ): Observable<I>;
  pipe<R>(...operations: OperatorFunction<T, R>[]): Observable<R>;
  /**
   * Used to stitch together functional operators into a chain.
   *
   * @return {Observable} the Observable result of all of the operators having
   * been called in the order they were passed in.
   *
   * ```
   * import { $from, map, filter, scan } from '@kbn/observable';
   *
   * $from([1, 2, 3])
   *   .pipe(
   *     filter(x => x % 2 === 0),
   *     map(x => x + x),
   *     scan((acc, x) => acc + x)
   *   )
   *   .subscribe(x => console.log(x))
   * ```
   */
  pipe<R>(...operations: OperatorFunction<T, R>[]): Observable<R> {
    if (operations.length === 0) {
      return this as any;
    }

    return pipeFromArray(operations)(this);
  }

  /**
   * Returns a promise that resolves to the last received value when completed.
   */
  toPromise(): Promise<T> {
    return new Promise((resolve, reject) => {
      let value: T;

      this.subscribe({
        next(x) {
          value = x;
        },
        error(err) {
          reject(err);
        },
        complete() {
          resolve(value);
        },
      });
    });
  }

  [symbolObservable]() {
    return this;
  }
}
