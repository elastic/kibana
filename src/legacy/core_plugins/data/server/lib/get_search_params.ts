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

import { first, map } from 'rxjs/operators';
import { Request } from 'hapi';
import KbnServer from 'src/legacy/server/kbn_server';
import { SearchParams } from 'elasticsearch';
import { SearchOptions } from '../../common';

export async function getSearchParams(
  request: Request,
  searchParams: SearchParams,
  options: SearchOptions
) {
  return {
    ...searchParams,
    timeout: searchParams.hasOwnProperty('timeout')
      ? searchParams.timeout
      : await getShardTimeout(request),
    preference: searchParams.hasOwnProperty('preference')
      ? searchParams.preference
      : await getPreference(request, options),
    maxConcurrentShardRequests: searchParams.hasOwnProperty('maxConcurrentShardRequests')
      ? (searchParams as any).maxConcurrentShardRequests
      : await getMaxConcurrentShardRequests(request),
    ignoreThrottled: searchParams.hasOwnProperty('ignoreThrottled')
      ? (searchParams as any).ignoreThrottled
      : await getIgnoreThrottled(request),
  };
}

export async function getShardTimeout(request: Request) {
  const kbnServer = (request.server as unknown) as KbnServer;
  const shardTimeout$ = kbnServer.newPlatform.setup.core.elasticsearch.legacy.config$.pipe(
    first(),
    map(config => config.shardTimeout.asMilliseconds())
  );
  const timeout = await shardTimeout$.toPromise();
  return `${timeout}ms`;
}

export async function getPreference(request: Request, { sessionId }: SearchOptions) {
  const config = request.getUiSettingsService();
  const setRequestPreferenceTo = await config.get('courier:setRequestPreference');
  if (setRequestPreferenceTo === 'sessionId') {
    return sessionId;
  } else if (setRequestPreferenceTo === 'custom') {
    return config.get('courier:customRequestPreference');
  }
}

export async function getMaxConcurrentShardRequests(request: Request) {
  const config = request.getUiSettingsService();
  const maxConcurrentShardRequests = await config.get('courier:maxConcurrentShardRequests');
  if (maxConcurrentShardRequests !== 0) return maxConcurrentShardRequests;
}

// TODO: Move to a plugin
export function getIgnoreThrottled(request: Request) {
  const config = request.getUiSettingsService();
  return !config.get('search:includeFrozen');
}
