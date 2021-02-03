/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { IScope } from 'angular';
import * as Rx from 'rxjs';
import { AngularHttpError } from '../notify/lib';

type FatalErrorFn = (error: AngularHttpError | Error | string, location?: string) => void;

function callInDigest($scope: IScope, fn: () => void, fatalError?: FatalErrorFn) {
  try {
    // this is terrible, but necessary to synchronously deliver subscription values
    // to angular scopes. This is required by some APIs, like the `config` service,
    // and beneficial for root level directives where additional digest cycles make
    // kibana sluggish to load.
    //
    // If you copy this code elsewhere you better have a good reason :)
    if ($scope.$root.$$phase) {
      fn();
    } else {
      $scope.$apply(() => fn());
    }
  } catch (error) {
    if (fatalError) {
      fatalError(error);
    }
  }
}

/**
 * Subscribe to an observable at a $scope, ensuring that the digest cycle
 * is run for subscriber hooks and routing errors to fatalError if not handled.
 */
export function subscribeWithScope<T>(
  $scope: IScope,
  observable: Rx.Observable<T>,
  observer?: Rx.PartialObserver<T>,
  fatalError?: FatalErrorFn
) {
  return observable.subscribe({
    next(value) {
      if (observer && observer.next) {
        callInDigest($scope, () => observer.next!(value), fatalError);
      }
    },
    error(error) {
      callInDigest(
        $scope,
        () => {
          if (observer && observer.error) {
            observer.error(error);
          } else {
            throw new Error(
              `Uncaught error in subscribeWithScope(): ${
                error ? error.stack || error.message : error
              }`
            );
          }
        },
        fatalError
      );
    },
    complete() {
      if (observer && observer.complete) {
        callInDigest($scope, () => observer.complete!(), fatalError);
      }
    },
  });
}
