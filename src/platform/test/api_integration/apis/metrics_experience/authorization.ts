/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import type { FtrProviderContext } from '../../ftr_provider_context';
import { timerange } from './timerange';
import { toggleMetricsExperienceFeature } from './utils/helpers';

const ROLE_NAME = 'metrics_experience_no_kibana_priv';
const USERNAME = 'metrics_experience_no_kibana_user';
const PASSWORD = 'metrics_experience_no_kibana_user_pwd';

export default function ({ getService }: FtrProviderContext) {
  const security = getService('security');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  describe('Authorization', () => {
    before(async () => {
      await esArchiver.load(
        'src/platform/test/api_integration/fixtures/es_archiver/metrics_experience'
      );
      await toggleMetricsExperienceFeature(supertest, true);

      await security.role.create(ROLE_NAME, {
        elasticsearch: {
          indices: [{ names: ['*'], privileges: ['read'] }],
        },
        // intentionally no kibana privileges
      });

      await security.user.create(USERNAME, {
        password: PASSWORD,
        roles: [ROLE_NAME],
        full_name: 'Metrics No Kibana User',
      });
    });

    after(async () => {
      await esArchiver.unload(
        'src/platform/test/api_integration/fixtures/es_archiver/metrics_experience'
      );
      await toggleMetricsExperienceFeature(supertest, false);
      await security.user.delete(USERNAME);
      await security.role.delete(ROLE_NAME);
    });

    describe('GET /internal/metrics_experience/dimensions', () => {
      const query = {
        indices: JSON.stringify(['fieldsense-station-metrics']),
        dimensions: JSON.stringify(['station.name']),
        from: timerange.min,
        to: timerange.max,
      };

      it('returns 403 for a user with no Kibana privileges', async () => {
        const { status } = await supertestWithoutAuth
          .get('/internal/metrics_experience/dimensions')
          .auth(USERNAME, PASSWORD)
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .query(query);

        expect(status).to.be(403);
      });

      it('returns 200 for an authenticated admin user', async () => {
        const { status } = await supertest
          .get('/internal/metrics_experience/dimensions')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .query(query);

        expect(status).to.be(200);
      });
    });

    describe('GET /internal/metrics_experience/fields', () => {
      const query = {
        index: 'fieldsense-station-metrics',
        from: timerange.min,
        to: timerange.max,
      };

      it('returns 403 for a user with no Kibana privileges', async () => {
        const { status } = await supertestWithoutAuth
          .get('/internal/metrics_experience/fields')
          .auth(USERNAME, PASSWORD)
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .query(query);

        expect(status).to.be(403);
      });

      it('returns 200 for an authenticated admin user', async () => {
        const { status } = await supertest
          .get('/internal/metrics_experience/fields')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .query(query);

        expect(status).to.be(200);
      });
    });

    describe('POST /internal/metrics_experience/fields/_search', () => {
      const body = {
        index: 'fieldsense-station-metrics',
        from: timerange.min,
        to: timerange.max,
      };

      it('returns 403 for a user with no Kibana privileges', async () => {
        const { status } = await supertestWithoutAuth
          .post('/internal/metrics_experience/fields/_search')
          .auth(USERNAME, PASSWORD)
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .send(body);

        expect(status).to.be(403);
      });

      it('returns 200 for an authenticated admin user', async () => {
        const { status } = await supertest
          .post('/internal/metrics_experience/fields/_search')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .send(body);

        expect(status).to.be(200);
      });
    });
  });
}
