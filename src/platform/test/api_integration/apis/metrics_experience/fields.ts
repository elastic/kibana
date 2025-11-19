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
const SEARCH_ENDPOINT = '/internal/metrics_experience/fields/_search';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const sendRequest = (query: object) =>
    supertest.get(ENDPOINT).set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana').query(query);

  const sendSearchRequest = (body: object) =>
    supertest.post(SEARCH_ENDPOINT).set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana').send(body);

  describe('Fields API', () => {
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
      await toggleMetricsExperienceFeature(supertest, false);
    });

    describe('GET /internal/metrics_experience/fields', () => {
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
    });

    describe('POST /internal/metrics_experience/fields/_search', () => {
      it('should return filtered fields with empty filters', async () => {
        const { body, status } = await sendSearchRequest({
          index: 'fieldsense-station-metrics',
          from: timerange.min,
          to: timerange.max,
          filters: {},
        });

        expect(status).to.be(200);
        expect(body.fields.length).to.be.greaterThan(0);
        expect(body.total).to.be.greaterThan(0);
        expect(body.page).to.be(1);
      });

      it('should filter fields by specific dimension values', async () => {
        const { body, status } = await sendSearchRequest({
          index: 'fieldsense-station-metrics',
          from: timerange.min,
          to: timerange.max,
          fields: ['fieldsense.energy.battery.charge_level'],
          filters: {
            'station.id': ['station-01'],
          },
        });

        expect(status).to.be(200);
        expect(body.fields).to.have.length(1);
        expect(body.fields[0]).to.eql({
          name: 'fieldsense.energy.battery.charge_level',
          index: 'fieldsense-station-metrics',
          dimensions: [
            {
              name: 'station.id',
              type: 'keyword',
            },
          ],
          type: 'double',
          instrument: 'gauge',
          unit: 'percent',
          noData: false,
        });
        expect(body.total).to.be.greaterThan(0);
        expect(body.page).to.be(1);
      });

      it('should handle multiple dimension filters', async () => {
        const { body, status } = await sendSearchRequest({
          index: 'fieldsense-station-metrics',
          from: timerange.min,
          to: timerange.max,
          fields: ['fieldsense.energy.battery.charge_level'],
          filters: {
            'station.id': ['station-01'],
            'station.location.country': ['AU'],
          },
        });

        expect(status).to.be(200);
        expect(body.fields).to.have.length(1);
        expect(body.fields[0]).to.eql({
          name: 'fieldsense.energy.battery.charge_level',
          index: 'fieldsense-station-metrics',
          dimensions: [
            {
              name: 'station.id',
              type: 'keyword',
            },
            {
              name: 'station.location.country',
              type: 'keyword',
            },
          ],
          type: 'double',
          instrument: 'gauge',
          unit: 'percent',
          noData: false,
        });
        expect(body.total).to.be.greaterThan(0);
        expect(body.page).to.be(1);
      });

      // TODO: see https://github.com/elastic/kibana/pull/243499
      it.skip('should return empty results if no fields match the filters', async () => {
        const { body, status } = await sendSearchRequest({
          index: 'fieldsense-station-metrics',
          from: timerange.min,
          to: timerange.max,
          fields: ['fieldsense.energy.battery.charge_level'],
          filters: {
            'station.id': ['station-199'],
          },
        });

        expect(status).to.be(200);
        expect(body.fields.length).to.equal(0);
        expect(body.total).to.equal(1);
        expect(body.page).to.equal(1);
      });
    });

    describe('disabled feature flag', () => {
      before(async () => {
        await toggleMetricsExperienceFeature(supertest, false);
      });

      after(async () => {
        await toggleMetricsExperienceFeature(supertest, true);
      });

      it('GET /internal/metrics_experience/fields should return 404 if feature flag is disabled', async () => {
        await toggleMetricsExperienceFeature(supertest, false);

        const { status } = await sendRequest({
          index: 'fieldsense-station-metrics',
          from: timerange.min,
          to: timerange.max,
        });
        expect(status).to.be(404);
      });

      it('POST /internal/metrics_experience/fields/_search should return 404 if feature flag is disabled', async () => {
        await toggleMetricsExperienceFeature(supertest, false);

        const { status } = await sendSearchRequest({
          index: 'fieldsense-station-metrics',
          from: timerange.min,
          to: timerange.max,
          fields: ['fieldsense.energy.battery.charge_level'],
          filters: {
            'station.id': ['station-01'],
          },
        });

        expect(status).to.be(404);
      });
    });
  });
}
