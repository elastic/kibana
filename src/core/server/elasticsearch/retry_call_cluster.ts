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

import { retryWhen, concatMap } from 'rxjs/operators';
import { defer, throwError, iif, timer } from 'rxjs';
import elasticsearch from 'elasticsearch';
import { CallAPIOptions } from '.';

/**
 * Retries the provided Elasticsearch API call when a `NoConnections` error is
 * encountered. The API call will be retried once a second, indefinitely, until
 * a successful response or a different error is received.
 *
 * @param apiCaller
 */

// TODO: Replace with APICaller from './scoped_cluster_client' once #46668 is merged
export function retryCallCluster(
  apiCaller: (
    endpoint: string,
    clientParams: Record<string, any>,
    options?: CallAPIOptions
  ) => Promise<any>
) {
  return (endpoint: string, clientParams: Record<string, any> = {}, options?: CallAPIOptions) => {
    return defer(() => apiCaller(endpoint, clientParams, options))
      .pipe(
        retryWhen(errors =>
          errors.pipe(
            concatMap((error, i) =>
              iif(
                () => error instanceof elasticsearch.errors.NoConnections,
                timer(1000),
                throwError(error)
              )
            )
          )
        )
      )
      .toPromise();
  };
}
