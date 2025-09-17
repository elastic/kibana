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

const indexPattern = 'metrics-*';
const ENDPOINT = `/internal/metrics_experience/index_pattern_metadata/${indexPattern}`;

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const sendRequest = (query: object) =>
    supertest.get(ENDPOINT).set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana').query(query);

  describe('GET /internal/metrics_experience/index_pattern_metadata/:indexPattern', () => {
    before(async () => {
      await toggleMetricsExperienceFeature(supertest, true);
      await esArchiver.load(
        'src/platform/test/api_integration/fixtures/es_archiver/metrics_experience'
      );
    });

    after(async () => {
      await esArchiver.unload(
        'src/platform/test/api_integration/fixtures/es_archiver/metrics_experience'
      );
    });

    it('should return 200 when the metrics experience feature flag is enabled', async () => {
      const { status } = await sendRequest({
        from: timerange.min,
        to: timerange.max,
      });
      expect(status).to.be(200);
    });

    it('should return 404 when feature flag is disabled', async () => {
      await toggleMetricsExperienceFeature(supertest, false);

      const { status } = await sendRequest({
        from: timerange.min,
        to: timerange.max,
      });
      expect(status).to.be(404);
    });
  });
}
