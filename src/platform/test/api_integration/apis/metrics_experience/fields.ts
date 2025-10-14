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

const ENDPOINT = '/internal/metrics_experience/fields';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const sendRequest = (query: object) =>
    supertest.get(ENDPOINT).set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana').query(query);

  describe('GET /internal/metrics_experience/fields', () => {
    before(async () => {
      await esArchiver.load(
        'src/platform/test/api_integration/fixtures/es_archiver/metrics_experience'
      );
    });

    after(async () => {
      await esArchiver.unload(
        'src/platform/test/api_integration/fixtures/es_archiver/metrics_experience'
      );
      await toggleMetricsExperienceFeature(supertest, true);
    });

    it('should return a list of fields', async () => {
      const { body, status } = await sendRequest({
        index: 'fieldsense-station-metrics',
        from: timerange.min,
        to: timerange.max,
      });

      expect(status).to.be(200);
      expect(body.fields.length).to.be.greaterThan(0);
      expect(body.total).to.be.greaterThan(0);
      expect(body.page).to.be(1);
    });

    it('should filter fields with the fields parameter', async () => {
      const { body, status } = await sendRequest({
        index: 'fieldsense-station-metrics',
        from: timerange.min,
        to: timerange.max,
        fields: 'fieldsense.energy.battery.charge_level',
      });

      expect(status).to.be(200);
      expect(body.fields.length).to.be(1);
      expect(body.fields[0].name).to.be('fieldsense.energy.battery.charge_level');
      expect(body.total).to.be(1);
    });

    it('should handle pagination', async () => {
      const { body, status } = await sendRequest({
        index: 'fieldsense-station-metrics',
        from: timerange.min,
        to: timerange.max,
        page: 2,
        size: 10,
      });

      expect(status).to.be(200);
      expect(body.fields.length).to.be.greaterThan(0);
      expect(body.total).to.be.greaterThan(0);
      expect(body.page).to.be(2);
    });

    it('should use default parameters if none are provided', async () => {
      const { status } = await sendRequest({});
      expect(status).to.be(200);
    });

    it('should return 404 if feature flag is disabled', async () => {
      await toggleMetricsExperienceFeature(supertest, false);

      const { status } = await sendRequest({
        index: 'fieldsense-station-metrics',
        from: timerange.min,
        to: timerange.max,
      });
      expect(status).to.be(404);
    });
  });
}
