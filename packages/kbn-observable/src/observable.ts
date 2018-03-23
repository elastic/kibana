import symbolObservable from 'symbol-observable';

import { OperatorFunction, UnaryFunction } from './interfaces';

const noop: () => any = () => {};

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
    if (this.closed) return;

    this._cancelSubscription();
    this._observer = undefined;
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
    if (this.closed) return;

    try {
      this._observer.next && this._observer.next(value);
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * Sends the sequence error
   */
  error(errorValue: Error) {
    if (this.closed) return;

    try {
      this._observer.error && this._observer.error(errorValue);
    } catch (e) {
      console.error(e);
    }
    this._subscription.unsubscribe();
  }

  /**
   * Sends the completion notification
   */
  complete() {
    if (this.closed) return;

    try {
      this._observer.complete && this._observer.complete();
    } catch (e) {
      console.error(e);
    }
    this._subscription.unsubscribe();
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
   * TODO add details
   *
   * Implementation detail:
   * The overload for `subscribe` below excludes the `...rest: never[]` from
   * editors when displaying the type for `subscribe`. The `...rest` arguments
   * are only there to fail when more than one arg is passed, as that is one of
   * the apis for subscribe in RxJS, but we decided it wasn't necessary in
   * Kibana. See https://www.typescriptlang.org/docs/handbook/functions.html#overloads
   * for details about overloading.
   */
  subscribe(
    observerOrNext?: PartialObserver<T> | ((value: T) => void)
  ): Subscription;
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
   *
   * Implenentation detail:
   * Overloads for `pipe` to enable a variable number of arguments, but still a
   * clear gradual progressions from arg to arg when transforming the input. See
   * https://www.typescriptlang.org/docs/handbook/functions.html#overloads for
   * details about overloading.
   */
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

function pipeFromArray<T, R>(fns: UnaryFunction<T, R>[]): UnaryFunction<T, R> {
  if (fns.length === 0) {
    return noop as UnaryFunction<T, R>;
  }

  return function piped(input: T): R {
    return fns.reduce((prev: any, fn) => fn(prev), input);
  };
}
