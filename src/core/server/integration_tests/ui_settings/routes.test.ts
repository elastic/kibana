/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { createRoot, request } from '@kbn/core-test-helpers-kbn-server';

describe('ui settings service', () => {
  describe('public routes', () => {
    let root: ReturnType<typeof createRoot>;
    beforeAll(async () => {
      root = createRoot({
        plugins: { initialize: false },
        elasticsearch: { skipStartupConnectionCheck: true },
        server: { restrictInternalApis: false },
      });

      await root.preboot();
      const { uiSettings } = await root.setup();
      uiSettings.register({
        custom: {
          value: '42',
          schema: schema.string(),
        },
      });
      // global uiSettings have to be registerd to be set
      uiSettings.registerGlobal({
        custom: {
          value: '42',
          schema: schema.string(),
        },
      });
      uiSettings.registerGlobal({
        foo: {
          value: 'foo',
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

  describe('internal routes', () => {
    let root: ReturnType<typeof createRoot>;
    beforeAll(async () => {
      root = createRoot({
        plugins: { initialize: false },
        elasticsearch: { skipStartupConnectionCheck: true },
        server: { restrictInternalApis: false },
      });

      await root.preboot();
      const { uiSettings } = await root.setup();
      uiSettings.register({
        custom: {
          value: '42',
          schema: schema.string(),
        },
      });
      // global uiSettings have to be registerd to be set
      uiSettings.registerGlobal({
        custom: {
          value: '42',
          schema: schema.string(),
        },
      });
      uiSettings.registerGlobal({
        foo: {
          value: 'foo',
          schema: schema.string(),
        },
      });

      await root.start();
    });
    afterAll(async () => await root.shutdown());

    describe('set', () => {
      it('validates value', async () => {
        const response = await request
          .post(root, '/internal/kibana/settings/custom')
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
          .post(root, '/internal/kibana/settings')
          .send({ changes: { custom: 100, foo: 'bar' } })
          .expect(400);

        expect(response.body.message).toBe(
          '[validation [custom]]: expected value of type [string] but got [number]'
        );
      });
    });

    describe('validate', () => {
      it('returns correct validation error message for invalid value', async () => {
        const response = await request
          .post(root, '/internal/kibana/settings/custom/validate')
          .send({ value: 100 })
          .expect(200);

        expect(response.body).toMatchObject({
          valid: false,
          errorMessage: 'expected value of type [string] but got [number]',
        });
      });

      it('returns no validation error message for valid value', async () => {
        const response = await request
          .post(root, '/internal/kibana/settings/custom/validate')
          .send({ value: 'test' })
          .expect(200);

        expect(response.body).toMatchObject({ valid: true });
      });

      it('returns a 404 for non-existing key', async () => {
        const response = await request
          .post(root, '/internal/kibana/settings/test/validate')
          .send({ value: 'test' })
          .expect(404);

        expect(response.body.message).toBe('Setting with a key [test] does not exist.');
      });

      it('returns a 400 for a null value', async () => {
        const response = await request
          .post(root, '/internal/kibana/settings/test/validate')
          .send({ value: null })
          .expect(400);

        expect(response.body.message).toBe('No value was specified.');
      });
    });

    describe('global', () => {
      describe('set', () => {
        it('validates value', async () => {
          const response = await request
            .post(root, '/internal/kibana/global_settings/custom')
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
            .post(root, '/internal/kibana/global_settings')
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
