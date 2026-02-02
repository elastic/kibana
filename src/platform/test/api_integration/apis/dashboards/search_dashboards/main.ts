/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  describe('main', () => {
    it('should retrieve a paginated list of dashboards', async () => {
      const response = await supertest
        .post('/api/dashboards/search')
        .set('ELASTIC_HTTP_VERSION_HEADER', '2023-10-31')
        .set('elastic-api-version', '1')
        .send({});

      expect(response.status).to.be(200);
      expect(response.body.total).to.be(100);
      expect(response.body.dashboards[0].id).to.be('test-dashboard-00');
      expect(response.body.dashboards.length).to.be(20);
    });

    it('should narrow results by search', async () => {
      const response = await supertest
        .post('/api/dashboards/search')
        .set('ELASTIC_HTTP_VERSION_HEADER', '2023-10-31')
        .set('elastic-api-version', '1')
        .send({
          search: '0*',
        });

      expect(response.status).to.be(200);
      expect(response.body.total).to.be(1);
      expect(response.body.dashboards.length).to.be(1);
    });

    it('should allow users to set a per page limit', async () => {
      const response = await supertest
        .post('/api/dashboards/search')
        .set('ELASTIC_HTTP_VERSION_HEADER', '2023-10-31')
        .set('elastic-api-version', '1')
        .send({
          per_page: 10,
        });

      expect(response.status).to.be(200);
      expect(response.body.total).to.be(100);
      expect(response.body.dashboards.length).to.be(10);
    });

    it('should allow users to paginate through the list of dashboards', async () => {
      const response = await supertest
        .post('/api/dashboards/search')
        .set('ELASTIC_HTTP_VERSION_HEADER', '2023-10-31')
        .set('elastic-api-version', '1')
        .send({
          page: 5,
          per_page: 10,
        });

      expect(response.status).to.be(200);
      expect(response.body.total).to.be(100);
      expect(response.body.dashboards.length).to.be(10);
      expect(response.body.dashboards[0].id).to.be('test-dashboard-40');
    });
  });
}
