/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { httpServiceMock } from '../http/http_service.mock';
import { DeprecationsClient } from './deprecations_client';

describe('DeprecationsClient', () => {
  const http = httpServiceMock.createSetupContract();
  const mockDeprecationsInfo = [
    { pluginId: 'testPluginId-1' },
    { pluginId: 'testPluginId-1' },
    { pluginId: 'testPluginId-2' },
  ];

  beforeEach(() => {
    http.fetch.mockReset();
    http.fetch.mockResolvedValue({ deprecationsInfo: mockDeprecationsInfo });
  });

  describe('getAllDeprecations', () => {
    it('returns a list of deprecations', async () => {
      const deprecationsClient = new DeprecationsClient({ http });
      const deprecations = await deprecationsClient.getAllDeprecations();
      expect(http.fetch).toBeCalledTimes(1);
      expect(http.fetch).toBeCalledWith('/api/deprecations/', {
        asSystemRequest: true,
      });

      expect(deprecations).toEqual(mockDeprecationsInfo);
    });
  });

  describe('getDeprecations', () => {
    it('returns deprecations for a single pluginId', async () => {
      const deprecationsClient = new DeprecationsClient({ http });
      const deprecations = await deprecationsClient.getDeprecations('testPluginId-1');

      expect(deprecations.length).toBe(2);
      expect(deprecations).toEqual([
        { pluginId: 'testPluginId-1' },
        { pluginId: 'testPluginId-1' },
      ]);
    });

    it('returns [] if the pluginId does not have any deprecations', async () => {
      const deprecationsClient = new DeprecationsClient({ http });
      const deprecations = await deprecationsClient.getDeprecations('testPluginId-4');

      expect(deprecations).toEqual([]);
    });

    it('calls the fetch api', async () => {
      const deprecationsClient = new DeprecationsClient({ http });
      http.fetch.mockResolvedValueOnce({
        deprecationsInfo: [{ pluginId: 'testPluginId-1' }, { pluginId: 'testPluginId-1' }],
      });
      http.fetch.mockResolvedValueOnce({
        deprecationsInfo: [{ pluginId: 'testPluginId-2' }, { pluginId: 'testPluginId-2' }],
      });
      const results = [
        ...(await deprecationsClient.getDeprecations('testPluginId-1')),
        ...(await deprecationsClient.getDeprecations('testPluginId-2')),
      ];

      expect(http.fetch).toBeCalledTimes(2);
      expect(results).toEqual([
        { pluginId: 'testPluginId-1' },
        { pluginId: 'testPluginId-1' },
        { pluginId: 'testPluginId-2' },
        { pluginId: 'testPluginId-2' },
      ]);
    });
  });
});
