/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/public/mocks';
import { telemetryPluginMock } from '@kbn/telemetry-plugin/public/mocks';
import { plugin } from '.';

describe('kibana_usage_collection/public', () => {
  const pluginInstance = plugin();

  describe('optIn fallback from telemetry', () => {
    test('should call optIn(false) when telemetry is disabled', () => {
      const coreSetup = coreMock.createSetup();
      const usageCollectionMock = usageCollectionPluginMock.createSetupContract();

      expect(pluginInstance.setup(coreSetup, { usageCollection: usageCollectionMock })).toBe(
        undefined
      );
      expect(coreSetup.analytics.optIn).toHaveBeenCalledWith({ global: { enabled: false } });
    });

    test('should NOT call optIn(false) when telemetry is enabled', () => {
      const coreSetup = coreMock.createSetup();
      const usageCollectionMock = usageCollectionPluginMock.createSetupContract();
      const telemetry = telemetryPluginMock.createSetupContract();

      expect(
        pluginInstance.setup(coreSetup, { usageCollection: usageCollectionMock, telemetry })
      ).toBe(undefined);
      expect(coreSetup.analytics.optIn).not.toHaveBeenCalled();
    });
  });
});
