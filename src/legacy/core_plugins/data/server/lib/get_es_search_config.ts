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
import { Server, Request, RequestQuery } from 'hapi';
import KbnServer from 'src/legacy/server/kbn_server';

export async function getEsSearchConfig(server: Server, request: Request) {
  const timeout = await getEsShardTimeout(server);
  const preference = await getEsPreference(request);
  const ignoreThrottled = await getEsIgnoreThrottled(request);
  return { timeout, preference, ignore_throttled: ignoreThrottled };
}

export async function getEsShardTimeout(server: Server) {
  const kbnServer = (server as unknown) as KbnServer;
  const shardTimeout$ = kbnServer.newPlatform.setup.core.elasticsearch.legacy.config$.pipe(
    first(),
    map(config => config.shardTimeout.asMilliseconds())
  );
  const timeout = await shardTimeout$.toPromise();
  return `${timeout}ms`;
}

export async function getEsPreference(request: Request) {
  const config = request.getUiSettingsService();
  const setRequestPreferenceTo = await config.get('courier:setRequestPreference');
  if (setRequestPreferenceTo === 'sessionId') {
    return (request.query as RequestQuery).sessionId;
  } else if (setRequestPreferenceTo === 'custom') {
    return await config.get('courier:customRequestPreference');
  }
}

export async function getEsIgnoreThrottled(request: Request) {
  const config = request.getUiSettingsService();
  return config.get('search:includeFrozen');
}
