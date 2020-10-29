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
import { Observable } from 'rxjs';
import type { Logger } from 'kibana/server';
import type { SearchUsage } from '../collectors';
import type { IKibanaSearchResponse } from '../../../common/search';

/**
 * trackSearchStatus is a custom rxjs operator that can be used to track the progress of a search.
 * @param Logger
 * @param SearchUsage
 */
export const trackSearchStatus = <
  KibanaResponse extends IKibanaSearchResponse = IKibanaSearchResponse
>(
  logger: Logger,
  usage?: SearchUsage
) => (source: Observable<KibanaResponse>) =>
  new Observable<KibanaResponse>((observer) =>
    source.subscribe({
      next(response) {
        const trackSuccessData = response.rawResponse.took;

        if (trackSuccessData) {
          logger.debug(`trackSearchStatus:next  ${trackSuccessData}`);
          usage?.trackSuccess(trackSuccessData);
        }
        observer.next(response);
      },
      error(err) {
        logger.debug(`trackSearchStatus:error ${err}`);
        usage?.trackError();
        observer.error(err);
      },
      complete() {
        observer.complete();
      },
    })
  );
