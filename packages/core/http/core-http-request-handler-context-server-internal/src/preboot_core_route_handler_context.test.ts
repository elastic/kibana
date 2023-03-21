/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PrebootCoreRouteHandlerContext } from './preboot_core_route_handler_context';
import { createPrebootCoreRouteHandlerContextParamsMock } from './test_helpers';

describe('#uiSettings', () => {
  describe('#client', () => {
    test('returns the results of corePreboot.uiSettings.createDefaultsClient', () => {
      const corePreboot = createPrebootCoreRouteHandlerContextParamsMock();
      const context = new PrebootCoreRouteHandlerContext(corePreboot);

      const client = context.uiSettings.client;
      const [{ value: mockResult }] = corePreboot.uiSettings.createDefaultsClient.mock.results;
      expect(client).toBe(mockResult);
    });

    test('only creates one instance', () => {
      const corePreboot = createPrebootCoreRouteHandlerContextParamsMock();
      const context = new PrebootCoreRouteHandlerContext(corePreboot);

      const client1 = context.uiSettings.client;
      const client2 = context.uiSettings.client;

      expect(corePreboot.uiSettings.createDefaultsClient).toHaveBeenCalledTimes(1);
      const [{ value: mockResult }] = corePreboot.uiSettings.createDefaultsClient.mock.results;
      expect(client1).toBe(mockResult);
      expect(client2).toBe(mockResult);
    });
  });
});
