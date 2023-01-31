/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { createRoot, request } from '@kbn/core-test-helpers-kbn-server';

describe('ui settings service', () => {
  describe('routes', () => {
    let root: ReturnType<typeof createRoot>;
    beforeAll(async () => {
      root = createRoot({
        plugins: { initialize: false },
        elasticsearch: { skipStartupConnectionCheck: true },
      });

      await root.preboot();
      const { uiSettings } = await root.setup();
      uiSettings.register({
        custom: {
          value: '42',
          schema: schema.string(),
        },
      });

      await root.start();
    });
    afterAll(async () => await root.shutdown());

    describe('set', () => {
      it('validates value', async () => {
        const response = await request
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
        const response = await request
          .post(root, '/api/kibana/settings')
          .send({ changes: { custom: 100, foo: 'bar' } })
          .expect(400);

        expect(response.body.message).toBe(
          '[validation [custom]]: expected value of type [string] but got [number]'
        );
      });
    });

    describe('global', () => {
      describe('set', () => {
        it('validates value', async () => {
          const response = await request
            .post(root, '/api/kibana/global_settings/custom')
            .send({ value: 100 })
            .expect(400);

          expect(response.body.message).toBe(
            '[validation [custom]]: expected value of type [string] but got [number]'
          );
        });
      });
      describe('set many', () => {
        it('validates value', async () => {
          const response = await request
            .post(root, '/api/kibana/global_settings')
            .send({ changes: { custom: 100, foo: 'bar' } })
            .expect(400);

          expect(response.body.message).toBe(
            '[validation [custom]]: expected value of type [string] but got [number]'
          );
        });
      });
    });
  });
});
