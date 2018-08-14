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

import * as kbnTestServer from '../test_utils/kbn_server';
const basePath = '/kibana';

describe('Server basePath config', () => {
  let kbnServer;
  beforeAll(async () => {
    kbnServer = kbnTestServer.createServer({ server: { basePath } });
    await kbnServer.ready();
    return kbnServer;
  });

  afterAll(async () => await kbnServer.close());

  test('appends the basePath to root redirect', async () => {
    const resp = await kbnServer.inject({
      url: '/',
      method: 'GET'
    });

    expect(resp).toHaveProperty('statusCode', 200);
    expect(resp.payload).toMatch(/defaultRoute = '\/kibana\/app\/kibana'/);
  });
});
