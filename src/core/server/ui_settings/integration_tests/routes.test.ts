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

import { schema } from '@kbn/config-schema';
import * as kbnTestServer from '../../../../test_utils/kbn_server';

describe('ui settings service', () => {
  describe('routes', () => {
    let root: ReturnType<typeof kbnTestServer.createRoot>;
    beforeAll(async () => {
      root = kbnTestServer.createRoot({ plugins: { initialize: false } });

      const { uiSettings } = await root.setup();
      uiSettings.register({
        custom: {
          value: '42',
          schema: schema.string(),
        },
      });

      await root.start();
    }, 30000);
    afterAll(async () => await root.shutdown());

    describe('set', () => {
      it('validates value', async () => {
        const response = await kbnTestServer.request
          .post(root, '/api/kibana/settings/custom')
          .send({ value: 100 })
          .expect(400);

        expect(response.body.message).toBe(
          '[validation [custom]]: expected value of type [string] but got [number]'
        );
      });
    });
    describe('set many', () => {
      it('validates value', async () => {
        const response = await kbnTestServer.request
          .post(root, '/api/kibana/settings')
          .send({ changes: { custom: 100, foo: 'bar' } })
          .expect(400);

        expect(response.body.message).toBe(
          '[validation [custom]]: expected value of type [string] but got [number]'
        );
      });
    });
  });
});
