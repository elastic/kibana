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

const ENDPOINT = '/internal/metrics_experience/dimensions';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const sendRequest = (query: object) =>
    supertest.get(ENDPOINT).set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana').query(query);

  describe('GET /internal/metrics_experience/dimensions', () => {
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

    it('should return dimension values for a single dimension', async () => {
      const { body, status } = await sendRequest({
        indices: JSON.stringify(['fieldsense-station-metrics']),
        dimensions: JSON.stringify(['station.name']),
        from: timerange.min,
        to: timerange.max,
      });

      expect(status).to.be(200);
      expect(body.values.length).to.be.greaterThan(0);
    });

    it('should return dimension values for multiple dimensions', async () => {
      const { body, status } = await sendRequest({
        indices: JSON.stringify(['fieldsense-station-metrics']),
        dimensions: JSON.stringify(['station.name', 'sensor.type', 'network.interface']),
        from: timerange.min,
        to: timerange.max,
      });

      expect(status).to.be(200);
      expect(body.values.length).to.be.greaterThan(0);
    });

    it('should return 400 if dimensions are missing', async () => {
      const { status } = await sendRequest({
        indices: JSON.stringify(['fieldsense-station-metrics']),
      });
      expect(status).to.be(400);
    });

    it('should return 400 if dimensions are invalid JSON', async () => {
      const { status } = await sendRequest({
        indices: JSON.stringify(['fieldsense-station-metrics']),
        dimensions: 'not-json',
      });
      expect(status).to.be(400);
    });

    it('should return 400 if dimensions is an empty array', async () => {
      const { status } = await sendRequest({
        indices: JSON.stringify(['fieldsense-station-metrics']),
        dimensions: JSON.stringify([]),
      });
      expect(status).to.be(400);
    });

    it('should return 404 if feature flag is disabled', async () => {
      await toggleMetricsExperienceFeature(supertest, false);

      const { status } = await sendRequest({
        indices: JSON.stringify(['fieldsense-station-metrics']),
        dimensions: JSON.stringify(['station.name']),
        from: timerange.min,
        to: timerange.max,
      });
      expect(status).to.be(404);
    });
  });
}
