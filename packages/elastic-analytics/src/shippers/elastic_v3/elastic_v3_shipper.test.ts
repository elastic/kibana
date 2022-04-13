/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { AnalyticsClientInitContext } from '../../analytics_client';
import type { Event } from '../../events';
import {
  shipperMock,
  uiShipperFactory,
  serverShipperFactory,
} from './elastic_v3_shipper.test.mocks';
import { ElasticV3Shipper } from './elastic_v3_shipper';

describe('ElasticV3Shipper', () => {
  const initContext: AnalyticsClientInitContext = {
    sendTo: 'staging',
    isDev: true,
    logger: loggerMock.create(),
  };

  const nextTick = () => new Promise((resolve) => setImmediate(resolve));

  describe.each(['server', 'ui'])('%s-side V3 shipper', (environment) => {
    let shipper: ElasticV3Shipper;

    beforeAll(async () => {
      if (environment === 'ui') {
        Object.defineProperty(global, 'window', { value: {} });
      }
      shipper = new ElasticV3Shipper({ version: '1.2.3', channelName: 'myChannel' }, initContext);
      await nextTick(); // await import inside, pushing a promise to the end of the event loop to wait for it.
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test(`instantiates a ${environment}-side V3 shipper (no window global variable)`, () => {
      if (environment === 'ui') {
        expect(uiShipperFactory).toHaveBeenCalled();
      } else {
        expect(serverShipperFactory).toHaveBeenCalled();
      }
    });

    test('passes-through the optIn request to the shipper', async () => {
      shipper.optIn(true);
      await nextTick();
      expect(shipperMock.optIn).toHaveBeenCalledWith(true);
    });

    test('passes-through the extendContext request to the shipper', async () => {
      shipper.extendContext({ some: 'context' });
      await nextTick();
      expect(shipperMock.extendContext).toHaveBeenCalledWith({ some: 'context' });
    });

    test('passes-through the reportEvents request to the shipper', async () => {
      const events: Event[] = [];
      shipper.reportEvents(events);
      await nextTick();
      expect(shipperMock.reportEvents).toHaveBeenCalledWith(events);
    });

    test('passes-through the shutdown request to the shipper', async () => {
      shipper.shutdown();
      await nextTick();
      expect(shipperMock.shutdown).toHaveBeenCalledWith();
    });
  });
});
