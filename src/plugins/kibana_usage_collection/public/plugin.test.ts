/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock } from '@kbn/core/public/mocks';
import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/public/mocks';
import { registerEbtCountersMock } from './plugin.test.mocks';
import { plugin } from '.';

describe('kibana_usage_collection/public', () => {
  const pluginInstance = plugin();

  describe('EBT stats -> UI Counters', () => {
    test('should report UI counters when EBT emits', () => {
      const coreSetup = coreMock.createSetup();
      const usageCollectionMock = usageCollectionPluginMock.createSetupContract();

      pluginInstance.setup(coreSetup, { usageCollection: usageCollectionMock });
      expect(registerEbtCountersMock).toHaveBeenCalledTimes(1);
    });
  });
});
