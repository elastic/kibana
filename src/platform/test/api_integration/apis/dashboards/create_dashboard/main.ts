/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { DASHBOARD_API_PATH } from '@kbn/dashboard-plugin/server';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  describe('main', () => {
    it('should create a dashboard', async () => {
      const title = 'Hello world dashboard';

      const response = await supertest
        .post(DASHBOARD_API_PATH)
        .set('kbn-xsrf', 'true')
        .set('ELASTIC_HTTP_VERSION_HEADER', '2023-10-31')
        .set('elastic-api-version', '1')
        .send({
          data: {
            title,
          },
        });

      expect(response.status).to.be(200);
      expect(response.body.spaces).to.eql(['default']);
      expect(response.body.data).to.eql({
        title,
      });
    });

    it('can create a dashboard with a specific id', async () => {
      const title = `foo-${Date.now()}-${Math.random()}`;
      const id = `bar-${Date.now()}-${Math.random()}`;

      const response = await supertest
        .post(DASHBOARD_API_PATH)
        .set('kbn-xsrf', 'true')
        .set('ELASTIC_HTTP_VERSION_HEADER', '2023-10-31')
        .set('elastic-api-version', '1')
        .send({
          id,
          data: {
            title,
          },
        });

      expect(response.status).to.be(200);
      expect(response.body.id).to.be(id);
    });

    // TODO Maybe move this test to x-pack/platform/test/api_integration/dashboards
    it('can create a dashboard in a defined space', async () => {
      const title = `foo-${Date.now()}-${Math.random()}`;

      const spaceId = 'space-1';

      const response = await supertest
        .post(DASHBOARD_API_PATH)
        .set('kbn-xsrf', 'true')
        .set('ELASTIC_HTTP_VERSION_HEADER', '2023-10-31')
        .set('elastic-api-version', '1')
        .send({
          data: {
            title,
          },
          spaces: [spaceId],
        });

      expect(response.status).to.be(200);
      expect(response.body.spaces).to.eql([spaceId]);
    });

    it('return error if provided id already exists', async () => {
      const title = `foo-${Date.now()}-${Math.random()}`;
      // id is a saved object loaded by the kbn_archiver
      const id = 'be3733a0-9efe-11e7-acb3-3dab96693fab';

      const response = await supertest
        .post(DASHBOARD_API_PATH)
        .set('kbn-xsrf', 'true')
        .set('ELASTIC_HTTP_VERSION_HEADER', '2023-10-31')
        .set('elastic-api-version', '1')
        .send({
          id,
          data: {
            title,
          },
        });

      expect(response.status).to.be(409);
      expect(response.body.message).to.be(
        'A dashboard with ID be3733a0-9efe-11e7-acb3-3dab96693fab already exists.'
      );
    });
  });
}
