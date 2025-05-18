/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import type { Response } from 'superagent';
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import moment from 'moment';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');

  const SPACES = ['default', 'other'];
  /**
   * default ID of the flights overview dashboard
   * @see {@link src/platform/plugins/shared/home/server/services/sample_data/data_sets/flights/index.ts}
   */
  const FLIGHTS_OVERVIEW_DASHBOARD_ID = '7adfa750-4c81-11e8-b3d7-01146121b73d';

  describe('sample data apis', () => {
    before(async () => {
      await esArchiver.emptyKibanaIndex();
    });
    after(async () => {
      await esArchiver.emptyKibanaIndex();
    });

    for (const space of SPACES) {
      const apiPath = `/s/${space}/api/sample_data`;

      describe(`list in the ${space} space (before install)`, () => {
        it('should return list of sample data sets with installed status', async () => {
          const resp = await supertest
            .get(apiPath)
            .set('kbn-xsrf', 'kibana')
            .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
            .expect(200);

          const flightsData = findFlightsData(resp);
          expect(flightsData.status).to.be('not_installed');
          expect(flightsData.overviewDashboard).to.be(FLIGHTS_OVERVIEW_DASHBOARD_ID);
        });
      });

      describe(`install in the ${space} space`, () => {
        it('should return 404 if id does not match any sample data sets', async () => {
          await supertest
            .post(`${apiPath}/xxxx`)
            .set('kbn-xsrf', 'kibana')
            .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
            .expect(404);
        });

        it('should return 200 if success', async () => {
          const resp = await supertest
            .post(`${apiPath}/flights`)
            .set('kbn-xsrf', 'kibana')
            .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
            .expect(200);

          expect(resp.body).to.eql({
            elasticsearchIndicesCreated: { kibana_sample_data_flights: 13014 },
            kibanaSavedObjectsLoaded: 7,
          });
        });

        describe('dates', () => {
          // dates being compared are not arbitrary, but rather the dates of the earliest and latest timestamp of the flight sample data
          // this can be verified in the flight data archive here {@link src/platform/plugins/shared/home/server/services/sample_data/data_sets/flights/flights.json.gz}
          const sampleDataTimeIntervalInMS = moment('2018-02-11T14:54:34').diff(
            moment('2018-01-01T00:00:00'),
            'milliseconds'
          );

          it('should load elasticsearch index containing sample data with dates relative to current time', async () => {
            const resp = await es.search<{ timestamp: string }>({
              index: 'kibana_sample_data_flights',
              sort: [{ timestamp: { order: 'desc' } }],
            });

            const doc = resp.hits.hits[0];
            const docMilliseconds = Date.parse(doc._source!.timestamp);
            const nowMilliseconds = Date.now();

            const delta = Math.abs(nowMilliseconds - docMilliseconds);
            expect(delta).to.be.lessThan(sampleDataTimeIntervalInMS);
          });

          it('should load elasticsearch index containing sample data with dates relative to now parameter', async () => {
            const nowString = `2000-01-01T00:00:00`;
            await supertest
              .post(`${apiPath}/flights?now=${nowString}`)
              .set('kbn-xsrf', 'kibana')
              .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana');

            const resp = await es.search<{ timestamp: string }>({
              index: 'kibana_sample_data_flights',
              sort: [{ timestamp: { order: 'desc' } }],
            });

            const doc = resp.hits.hits[0];
            const docMilliseconds = Date.parse(doc._source!.timestamp);
            const nowMilliseconds = Date.parse(nowString);
            const delta = Math.abs(nowMilliseconds - docMilliseconds);
            expect(delta).to.be.lessThan(sampleDataTimeIntervalInMS);
          });
        });
      });

      describe(`list in the ${space} space (after install)`, () => {
        it('should return list of sample data sets with installed status', async () => {
          const resp = await supertest
            .get(apiPath)
            .set('kbn-xsrf', 'kibana')
            .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
            .expect(200);

          const flightsData = findFlightsData(resp);
          expect(flightsData.status).to.be('installed');
          if (space === 'default') {
            expect(flightsData.overviewDashboard).to.be(FLIGHTS_OVERVIEW_DASHBOARD_ID);
          } else {
            // the sample data objects installed in the 'other' space had their IDs regenerated upon import
            expect(flightsData.overviewDashboard).not.to.be(FLIGHTS_OVERVIEW_DASHBOARD_ID);
          }
        });
      });
    }

    for (const space of SPACES) {
      const apiPath = `/s/${space}/api/sample_data`;

      describe(`uninstall in the ${space} space`, () => {
        it('should uninstall sample data', async () => {
          // Note: the second time this happens, the index has already been removed, but the uninstall works anyway
          await supertest
            .delete(`${apiPath}/flights`)
            .set('kbn-xsrf', 'kibana')
            .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
            .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
            .expect(204);
        });

        it('should remove elasticsearch index containing sample data', async () => {
          const resp = await es.indices.exists({
            index: 'kibana_sample_data_flights',
          });
          expect(resp).to.be(false);
        });
      });

      describe(`list in the ${space} space (after uninstall)`, () => {
        it('should return list of sample data sets with installed status', async () => {
          const resp = await supertest
            .get(apiPath)
            .set('kbn-xsrf', 'kibana')
            .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
            .expect(200);

          const flightsData = findFlightsData(resp);
          expect(flightsData.status).to.be('not_installed');
          expect(flightsData.overviewDashboard).to.be(FLIGHTS_OVERVIEW_DASHBOARD_ID);
        });
      });
    }
  });
}

function findFlightsData(response: Response) {
  expect(response.body).to.be.an('array');
  expect(response.body.length).to.be.above(0);
  // @ts-expect-error Binding element 'id' implicitly has an 'any' type.
  const flightsData = response.body.find(({ id }) => id === 'flights');
  if (!flightsData) {
    throw new Error('Could not find flights data');
  }
  return flightsData;
}
