// This adds a symbol type for `Symbol.observable`, which doesn't exist globally
// in TypeScript yet.
declare global {
  export interface SymbolConstructor {
    readonly observable: symbol;
  }
}

// These types are based on the Observable proposal readme, see
// https://github.com/tc39/proposal-observable#api, with the addition of using
// generics to define the type of the `value`.

declare namespace Observable {
  interface Subscription {
    // Cancels the subscription
    unsubscribe(): void;

    // A boolean value indicating whether the subscription is closed
    closed: boolean;
  }

  interface SubscriptionObserver<T> {
    // Sends the next value in the sequence
    next(value: T): void;

    // Sends the sequence error
    error(errorValue: Error): void;

    // Sends the completion notification
    complete(): void;

    // A boolean value indicating whether the subscription is closed
    closed: boolean;
  }

  interface Observer<T> {
    // Receives the subscription object when `subscribe` is called
    start?(subscription: Subscription): void;

    // Receives the next value in the sequence
    next?(value: T): void;

    // Receives the sequence error
    error?(errorValue: Error): void;

    // Receives a completion notification
    complete?(): void;
  }

  type SubscriberFunction<T> = (
    observer: SubscriptionObserver<T>
  ) => (() => void) | Subscription;

  class Observable<T> {
    constructor(subscriber: SubscriberFunction<T>);

    // Subscribes to the sequence with an observer
    subscribe(observer: Observer<T>): Subscription;

    // Subscribes to the sequence with callbacks
    subscribe(
      onNext: (val: T) => void,
      onError?: (err: Error) => void,
      onComplete?: () => void
    ): Subscription;

    // Returns itself
    [Symbol.observable](): Observable<T>;
  }
}

export = Observable;
