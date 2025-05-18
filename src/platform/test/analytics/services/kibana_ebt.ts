/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import '@kbn/analytics-ftr-helpers-plugin/public/types';
import type { EBTHelpersContract } from '@kbn/analytics-ftr-helpers-plugin/common/types';
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import type { FtrProviderContext } from '../../functional/ftr_provider_context';

export function KibanaEBTServerProvider({ getService }: FtrProviderContext): EBTHelpersContract {
  const supertest = getService('supertest');

  const setOptIn = async (optIn: boolean) => {
    await supertest
      .post(`/internal/analytics_ftr_helpers/opt_in`)
      .set('kbn-xsrf', 'xxx')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .query({ consent: optIn })
      .expect(200);
  };

  return {
    setOptIn,
    getEvents: async (
      takeNumberOfEvents,
      { eventTypes = [], withTimeoutMs, fromTimestamp, filters } = {}
    ) => {
      await setOptIn(true);
      const resp = await supertest
        .get(`/internal/analytics_ftr_helpers/events`)
        .query({
          takeNumberOfEvents,
          eventTypes: JSON.stringify(eventTypes),
          withTimeoutMs,
          fromTimestamp,
          filters: JSON.stringify(filters),
        })
        .set('kbn-xsrf', 'xxx')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .expect(200);

      return resp.body;
    },
    getEventCount: async ({ eventTypes = [], withTimeoutMs, fromTimestamp, filters }) => {
      await setOptIn(true);
      const resp = await supertest
        .get(`/internal/analytics_ftr_helpers/count_events`)
        .query({
          eventTypes: JSON.stringify(eventTypes),
          withTimeoutMs,
          fromTimestamp,
          filters: JSON.stringify(filters),
        })
        .set('kbn-xsrf', 'xxx')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .expect(200);

      return resp.body.count;
    },
  };
}

export function KibanaEBTUIProvider({
  getService,
  getPageObjects,
}: FtrProviderContext): EBTHelpersContract {
  const { common } = getPageObjects(['common']);
  const browser = getService('browser');

  const setOptIn = async (optIn: boolean) => {
    await browser.execute((isOptIn) => window.__analytics_ftr_helpers__.setOptIn(isOptIn), optIn);
  };

  return {
    setOptIn: async (optIn) => {
      if (!(await common.isChromeVisible())) {
        // The browser has not loaded Kibana yet. Let's open `home`.
        await common.navigateToApp('home');
      }
      await setOptIn(optIn);
    },
    getEvents: async (numberOfEvents, options) => {
      await setOptIn(true);
      return await browser.execute(
        ({ numberOfEvents: _numberOfEvents, options: _options }) =>
          window.__analytics_ftr_helpers__.getEvents(_numberOfEvents, _options),
        { numberOfEvents, options }
      );
    },
    getEventCount: async (options) => {
      await setOptIn(true);
      return await browser.execute(
        ({ options: _options }) => window.__analytics_ftr_helpers__.getEventCount(_options),
        { options }
      );
    },
  };
}
