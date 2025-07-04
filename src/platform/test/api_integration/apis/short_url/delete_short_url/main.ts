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

  describe('main', () => {
    it('can delete a short URL', async () => {
      const response1 = await supertest.post('/api/short_url').send({
        locatorId: 'LEGACY_SHORT_URL_LOCATOR',
        params: {},
      });
      const response2 = await supertest.get('/api/short_url/' + response1.body.id);

      expect(response2.body).to.eql(response1.body);

      const response3 = await supertest.delete('/api/short_url/' + response1.body.id);

      expect(response3.status).to.eql(200);
      expect(response3.body).to.eql(null);

      const response4 = await supertest.get('/api/short_url/' + response1.body.id);

      expect(response4.status).to.eql(404);
    });

    it('returns 404 when deleting already deleted short URL', async () => {
      const response1 = await supertest.post('/api/short_url').send({
        locatorId: 'LEGACY_SHORT_URL_LOCATOR',
        params: {},
      });

      const response3 = await supertest.delete('/api/short_url/' + response1.body.id);

      expect(response3.status).to.eql(200);

      const response4 = await supertest.delete('/api/short_url/' + response1.body.id);

      expect(response4.status).to.eql(404);
    });

    it('returns 404 when deleting a non-existing model', async () => {
      const response = await supertest.delete('/api/short_url/' + 'non-existing-id');

      expect(response.status).to.eql(404);
    });
  });
}
