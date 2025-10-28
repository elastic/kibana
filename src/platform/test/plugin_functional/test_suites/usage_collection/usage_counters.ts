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
import { serializeCounterKey } from '@kbn/usage-collection-plugin/server/usage_counters';
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
    before(async () => {
      const key = serializeCounterKey({
        domainId: 'usageCollectionTestPlugin',
        counterName: 'routeAccessed',
        counterType: 'count',
        source: 'server',
      });

      await supertest.delete(`/api/saved_objects/counter/${key}`).set('kbn-xsrf', 'true');
    });

    it('stores usage counters sent during start and setup', async () => {
      await retry.try(async () => {
        const { duringSetup, duringStart, routeAccessed } = await getSavedObjectCounters();

        expect(duringSetup).to.be(11);
        expect(duringStart).to.be(1);
        expect(routeAccessed).to.be(undefined);
      });
    });

    it('stores usage counters triggered by runtime activities', async () => {
      await supertest.get('/api/usage_collection_test_plugin').set('kbn-xsrf', 'true').expect(200);

      let routeAccessed: number | undefined;

      await retry.waitFor('routeAccessed counter is initialized', async () => {
        ({ routeAccessed } = await getSavedObjectCounters());
        return Boolean(routeAccessed);
      });

      expect(routeAccessed).to.be(1);
    });
  });
}
