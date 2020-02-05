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
jest.mock('../../../ui/ui_settings/ui_settings_mixin', () => {
  return jest.fn();
});

import * as kbnTestServer from '../../../../test_utils/kbn_server';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { Root } from '../../../../core/server/root';

let mockDefaultRouteSetting: any = '';

describe('default route provider', () => {
  let root: Root;
  beforeAll(async () => {
    root = kbnTestServer.createRoot({ migrations: { skip: true } });

    await root.setup();
    await root.start();

    const kbnServer = kbnTestServer.getKbnServer(root);

    kbnServer.server.decorate('request', 'getUiSettingsService', function() {
      return {
        get: (key: string) => {
          if (key === 'defaultRoute') {
            return Promise.resolve(mockDefaultRouteSetting);
          }
          throw Error(`unsupported ui setting: ${key}`);
        },
        getRegistered: () => {
          return {
            defaultRoute: {
              value: '/app/kibana',
            },
          };
        },
      };
    });
  }, 30000);

  afterAll(async () => await root.shutdown());

  it('redirects to the configured default route', async function() {
    mockDefaultRouteSetting = '/app/some/default/route';

    const { status, header } = await kbnTestServer.request.get(root, '/');
    expect(status).toEqual(302);
    expect(header).toMatchObject({
      location: '/app/some/default/route',
    });
  });

  const invalidRoutes = [
    'http://not-your-kibana.com',
    '///example.com',
    '//example.com',
    ' //example.com',
  ];
  for (const route of invalidRoutes) {
    it(`falls back to /app/kibana when the configured route (${route}) is not a valid relative path`, async function() {
      mockDefaultRouteSetting = route;

      const { status, header } = await kbnTestServer.request.get(root, '/');
      expect(status).toEqual(302);
      expect(header).toMatchObject({
        location: '/app/kibana',
      });
    });
  }
});
