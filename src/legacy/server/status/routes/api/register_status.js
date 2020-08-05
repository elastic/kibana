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

import { wrapAuthConfig } from '../../wrap_auth_config';

const matchSnapshot = /-SNAPSHOT$/;

export function registerStatusApi(kbnServer, server, config) {
  const wrapAuth = wrapAuthConfig(config.get('status.allowAnonymous'));

  server.route(
    wrapAuth({
      method: 'GET',
      path: '/api/status',
      config: {
        tags: ['api'],
      },
      async handler() {
        return {
          name: config.get('server.name'),
          uuid: config.get('server.uuid'),
          version: {
            number: config.get('pkg.version').replace(matchSnapshot, ''),
            build_hash: config.get('pkg.buildSha'),
            build_number: config.get('pkg.buildNum'),
            build_snapshot: matchSnapshot.test(config.get('pkg.version')),
          },
          status: kbnServer.status.toJSON(),
          metrics: kbnServer.metrics,
        };
      },
    })
  );
}
