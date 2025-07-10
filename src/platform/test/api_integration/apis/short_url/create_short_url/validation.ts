/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('validation', () => {
    it('returns error when no data is provided in POST payload', async () => {
      const response = await supertest.post('/api/short_url');

      expect(response.status).to.be(400);
      expect(response.body.statusCode).to.be(400);
      expect(response.body.message).to.be(
        '[request body]: expected a plain object value, but found [null] instead.'
      );
    });

    it('returns error when locator ID is not provided', async () => {
      const response = await supertest.post('/api/short_url').send({
        params: {},
      });

      expect(response.status).to.be(400);
    });

    it('returns error when locator is not found', async () => {
      const response = await supertest.post('/api/short_url').send({
        locatorId: 'LEGACY_SHORT_URL_LOCATOR-NOT_FOUND',
        params: {},
      });

      expect(response.status).to.be(409);
      expect(response.body.statusCode).to.be(409);
      expect(response.body.error).to.be('Conflict');
      expect(response.body.message).to.be('Locator not found.');
    });

    it('returns error when slug is too short', async () => {
      const response = await supertest.post('/api/short_url').send({
        locatorId: 'LEGACY_SHORT_URL_LOCATOR',
        params: {},
        slug: 'a',
      });

      expect(response.status).to.be(400);
    });

    it('returns error on invalid character in slug', async () => {
      const response = await supertest.post('/api/short_url').send({
        locatorId: 'LEGACY_SHORT_URL_LOCATOR',
        params: {
          url: '/foo/bar',
        },
        slug: 'pipe|is-not-allowed',
      });

      expect(response.status >= 400).to.be(true);
    });
  });
}
