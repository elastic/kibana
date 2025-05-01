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
    it('errors when short URL ID is too short', async () => {
      const response = await supertest.get('/api/short_url/ab');

      expect(response.body).to.eql({
        statusCode: 400,
        error: 'Bad Request',
        message:
          '[request params.id]: value has length [2] but it must have a minimum length of [4].',
      });
    });

    it('errors when short URL ID is too long', async () => {
      const response = await supertest.get(
        '/api/short_url/abcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghij'
      );

      expect(response.body).to.eql({
        statusCode: 400,
        error: 'Bad Request',
        message:
          '[request params.id]: value has length [130] but it must have a maximum length of [128].',
      });
    });
  });
}
