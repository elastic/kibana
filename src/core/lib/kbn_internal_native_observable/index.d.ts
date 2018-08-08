/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

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

interface Subscription {
  // A boolean value indicating whether the subscription is closed
  closed: boolean;

  // Cancels the subscription
  unsubscribe(): void;
}

interface Subscribable<T> {
  subscribe(
    observerOrNext?: SubscriptionObserver<T> | ((value: T) => void),
    error?: (error: any) => void,
    complete?: () => void
  ): Subscription;
}

type ObservableInput<T> = Subscribable<T> | Iterable<T>;

interface SubscriptionObserver<T> {
  // A boolean value indicating whether the subscription is closed
  closed: boolean;

  // Sends the next value in the sequence
  next(value: T): void;

  // Sends the sequence error
  error(errorValue: Error): void;

  // Sends the completion notification
  complete(): void;
}

export interface StartObserver<T> {
  start(subscription: Subscription): void;
  next?(value: T): void;
  error?(err: any): void;
  complete?(): void;
}

export interface NextObserver<T> {
  start?(subscription: Subscription): void;
  next(value: T): void;
  error?(err: any): void;
  complete?(): void;
}

interface ErrorObserver<T> {
  start?(subscription: Subscription): void;
  next?(value: T): void;
  error(err: any): void;
  complete?(): void;
}

interface CompletionObserver<T> {
  start?(subscription: Subscription): void;
  next?(value: T): void;
  error?(err: any): void;
  complete(): void;
}

type PartialObserver<T> =
  | StartObserver<T>
  | NextObserver<T>
  | ErrorObserver<T>
  | CompletionObserver<T>;

interface Observer<T> {
  // Receives the subscription object when `subscribe` is called
  start(subscription: Subscription): void;

  // Receives the next value in the sequence
  next(value: T): void;

  // Receives the sequence error
  error(errorValue: Error): void;

  // Receives a completion notification
  complete(): void;
}

type SubscriberFunction<T> = (
  observer: SubscriptionObserver<T>
) => void | null | undefined | (() => void) | Subscription;

export class Observable<T> {
  public static of<T>(...items: T[]): Observable<T>;
  public static from<T>(x: ObservableInput<T>): Observable<T>;

  constructor(subscriber: SubscriberFunction<T>);

  // Subscribes to the sequence with an observer
  public subscribe(): Subscription;
  public subscribe(observer: PartialObserver<T>): Subscription;

  // Subscribes to the sequence with callbacks
  public subscribe(
    onNext: (val: T) => void,
    onError?: (err: Error) => void,
    onComplete?: () => void
  ): Subscription;

  // Returns itself
  public [Symbol.observable](): Observable<T>;
}
