import symbolObservable from 'symbol-observable';

// This is a fork of the example implementation of the TC39 Observable spec,
// see https://github.com/tc39/proposal-observable.
//
// One change has been applied to work with current libraries: using the
// Symbol.observable ponyfill instead of relying on the implementation in the
// spec.

// === Abstract Operations ===

function nonEnum(obj) {

  Object.getOwnPropertyNames(obj).forEach(k => {
    Object.defineProperty(obj, k, { enumerable: false });
  });

  return obj;
}

function getMethod(obj, key) {

  let value = obj[key];

  if (value == null)
    return undefined;

  if (typeof value !== "function")
    throw new TypeError(value + " is not a function");

  return value;
}

function cleanupSubscription(subscription) {

  // Assert:  observer._observer is undefined

  let cleanup = subscription._cleanup;

  if (!cleanup)
    return;

  // Drop the reference to the cleanup function so that we won't call it
  // more than once
  subscription._cleanup = undefined;

  // Call the cleanup function
  try {
    cleanup();
  }
  catch(e) {
    // HostReportErrors(e);
  }
}

function subscriptionClosed(subscription) {

  return subscription._observer === undefined;
}

function closeSubscription(subscription) {

  if (subscriptionClosed(subscription))
    return;

  subscription._observer = undefined;
  cleanupSubscription(subscription);
}

function cleanupFromSubscription(subscription) {
  return _=> { subscription.unsubscribe() };
}

function Subscription(observer, subscriber) {
  // Assert: subscriber is callable
  // The observer must be an object
  this._cleanup = undefined;
  this._observer = observer;

  // If the observer has a start method, call it with the subscription object
  try {
    let start = getMethod(observer, "start");

    if (start) {
      start.call(observer, this);
    }
  }
  catch(e) {
    // HostReportErrors(e);
  }

  // If the observer has unsubscribed from the start method, exit
  if (subscriptionClosed(this))
    return;

  observer = new SubscriptionObserver(this);

  try {

    // Call the subscriber function
    let cleanup = subscriber.call(undefined, observer);

    // The return value must be undefined, null, a subscription object, or a function
    if (cleanup != null) {
      if (typeof cleanup.unsubscribe === "function")
        cleanup = cleanupFromSubscription(cleanup);
      else if (typeof cleanup !== "function")
        throw new TypeError(cleanup + " is not a function");

      this._cleanup = cleanup;
    }

  } catch (e) {

    // If an error occurs during startup, then send the error
    // to the observer.
    observer.error(e);
    return;
  }

  // If the stream is already finished, then perform cleanup
  if (subscriptionClosed(this)) {
    cleanupSubscription(this);
  }
}

Subscription.prototype = nonEnum({
  get closed() { return subscriptionClosed(this) },
  unsubscribe() { closeSubscription(this) },
});

function SubscriptionObserver(subscription) {
  this._subscription = subscription;
}

SubscriptionObserver.prototype = nonEnum({

  get closed() {

    return subscriptionClosed(this._subscription);
  },

  next(value) {

    let subscription = this._subscription;

    // If the stream if closed, then return undefined
    if (subscriptionClosed(subscription))
      return undefined;

    let observer = subscription._observer;

    try {
      let m = getMethod(observer, "next");

      // If the observer doesn't support "next", then return undefined
      if (!m)
        return undefined;

      // Send the next value to the sink
      m.call(observer, value);
    }
    catch(e) {
      // HostReportErrors(e);
    }
    return undefined;
  },

  error(value) {

    let subscription = this._subscription;

    // If the stream is closed, throw the error to the caller
    if (subscriptionClosed(subscription)) {
      return undefined;
    }

    let observer = subscription._observer;
    subscription._observer = undefined;

    try {

      let m = getMethod(observer, "error");

      // If the sink does not support "complete", then return undefined
      if (m) {
        m.call(observer, value);
      }
      else {
        // HostReportErrors(e);
      }
    } catch (e) {
      // HostReportErrors(e);
    }

    cleanupSubscription(subscription);

    return undefined;
  },

  complete() {

    let subscription = this._subscription;

    // If the stream is closed, then return undefined
    if (subscriptionClosed(subscription))
      return undefined;

    let observer = subscription._observer;
    subscription._observer = undefined;

    try {

      let m = getMethod(observer, "complete");

      // If the sink does not support "complete", then return undefined
      if (m) {
        m.call(observer);
      }
    } catch (e) {
      // HostReportErrors(e);
    }

    cleanupSubscription(subscription);

    return undefined;
  },

});

export class Observable {

  // == Fundamental ==

  constructor(subscriber) {

    // The stream subscriber must be a function
    if (typeof subscriber !== "function")
      throw new TypeError("Observable initializer must be a function");

    this._subscriber = subscriber;
  }

  subscribe(observer, ...args) {
    if (typeof observer === "function") {
      observer = {
        next: observer,
        error: args[0],
        complete: args[1]
      };
    }
    else if (typeof observer !== "object") {
      observer = {};
    }

    return new Subscription(observer, this._subscriber);
  }

  [symbolObservable]() { return this }

  // == Derived ==

  static from(x) {

    let C = typeof this === "function" ? this : Observable;

    if (x == null)
      throw new TypeError(x + " is not an object");

    let method = getMethod(x, symbolObservable);

    if (method) {

      let observable = method.call(x);

      if (Object(observable) !== observable)
        throw new TypeError(observable + " is not an object");

      if (observable.constructor === C)
        return observable;

      return new C(observer => observable.subscribe(observer));
    }

    method = getMethod(x, Symbol.iterator);

    if (!method)
      throw new TypeError(x + " is not observable");

    return new C(observer => {

      for (let item of method.call(x)) {

        observer.next(item);

        if (observer.closed)
          return;
      }

      observer.complete();
    });
  }

  static of(...items) {

    let C = typeof this === "function" ? this : Observable;

    return new C(observer => {

      for (let i = 0; i < items.length; ++i) {

        observer.next(items[i]);

        if (observer.closed)
          return;
      }

      observer.complete();
    });
  }

}
