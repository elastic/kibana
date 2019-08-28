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

import { IScope } from 'angular';
import * as Rx from 'rxjs';
import { fatalError } from 'ui/notify/fatal_error';

function callInDigest($scope: IScope, fn: () => void) {
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
    fatalError(error);
  }
}

/**
 * Subscribe to an observable at a $scope, ensuring that the digest cycle
 * is run for subscriber hooks and routing errors to fatalError if not handled.
 */
export function subscribeWithScope<T>(
  $scope: IScope,
  observable: Rx.Observable<T>,
  observer?: Rx.PartialObserver<T>
) {
  return observable.subscribe({
    next(value) {
      if (observer && observer.next) {
        callInDigest($scope, () => observer.next!(value));
      }
    },
    error(error) {
      callInDigest($scope, () => {
        if (observer && observer.error) {
          observer.error(error);
        } else {
          throw new Error(
            `Uncaught error in subscribeWithScope(): ${
              error ? error.stack || error.message : error
            }`
          );
        }
      });
    },
    complete() {
      if (observer && observer.complete) {
        callInDigest($scope, () => observer.complete!());
      }
    },
  });
}
