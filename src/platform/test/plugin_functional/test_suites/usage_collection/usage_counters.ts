/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import type { UsageCountersSavedObject } from '@kbn/usage-collection-plugin/server/usage_counters';
import type { PluginFunctionalProviderContext } from '../../services';

export default function ({ getService, getPageObjects }: PluginFunctionalProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');

  async function getSavedObjectCounters() {
    return supertest
      .get('/api/saved_objects/_find?type=usage-counter')
      .set('kbn-xsrf', 'true')
      .expect(200)
      .then(({ body }) => {
        expect(body.total).to.above(1);
        return (body.saved_objects as UsageCountersSavedObject[]).reduce((acc, savedObj) => {
          const { count, counterName, domainId } = savedObj.attributes;
          if (domainId === 'usageCollectionTestPlugin') {
            acc[counterName] = count;
          }

          return acc;
        }, {} as Record<string, number>);
      });
  }

  describe('Usage Counters service', () => {
    it('stores usage counters sent during start and setup', async () => {
      await retry.try(async () => {
        const { duringSetup, duringStart, routeAccessed } = await getSavedObjectCounters();

        expect(duringSetup).to.be(11);
        expect(duringStart).to.be(1);
        expect(routeAccessed).to.be(undefined);
      });
    });

    it('stores usage counters triggered by runtime activities', async () => {
      // Pull initial values
      const initialCounters = await getSavedObjectCounters();
      const initialRouteAccessed = initialCounters.routeAccessed || 0;
      expect(initialRouteAccessed).to.be(0);

      // Send the request
      await supertest.get('/api/usage_collection_test_plugin').set('kbn-xsrf', 'true').expect(200);

      // Check routeAccessed counter was updated
      let routeAccessed: number | undefined;
      await retry.waitFor('routeAccessed counter is incremented', async () => {
        ({ routeAccessed } = await getSavedObjectCounters());
        return routeAccessed !== undefined && routeAccessed > initialRouteAccessed;
      });
      expect(routeAccessed).to.be(initialRouteAccessed + 1);
    });
  });
}
