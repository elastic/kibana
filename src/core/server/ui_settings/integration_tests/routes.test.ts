/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import * as kbnTestServer from '../../../test_helpers/kbn_server';

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
