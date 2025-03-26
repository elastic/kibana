/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { PUBLIC_API_PATH } from '@kbn/dashboard-plugin/server';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  describe('main', () => {
    it('should retrieve a paginated list of dashboards', async () => {
      const response = await supertest
        .get(`${PUBLIC_API_PATH}`)
        .set('ELASTIC_HTTP_VERSION_HEADER', '2023-10-31')
        .send();

      expect(response.status).to.be(200);
      expect(response.body.total).to.be(100);
      expect(response.body.items[0].id).to.be('test-dashboard-0');
      expect(response.body.items.length).to.be(20);
    });

    it('should allow users to set a per page limit', async () => {
      const response = await supertest
        .get(`${PUBLIC_API_PATH}?perPage=10`)
        .set('ELASTIC_HTTP_VERSION_HEADER', '2023-10-31')
        .send();

      expect(response.status).to.be(200);
      expect(response.body.total).to.be(100);
      expect(response.body.items.length).to.be(10);
    });

    it('should allow users to paginate through the list of dashboards', async () => {
      const response = await supertest
        .get(`${PUBLIC_API_PATH}?page=5&perPage=10`)
        .set('ELASTIC_HTTP_VERSION_HEADER', '2023-10-31')
        .send();

      expect(response.status).to.be(200);
      expect(response.body.total).to.be(100);
      expect(response.body.items.length).to.be(10);
      expect(response.body.items[0].id).to.be('test-dashboard-40');
    });
  });
}
