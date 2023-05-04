/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticV3ServerShipper } from '@kbn/analytics-shippers-elastic-v3-server';
import { coreMock } from '@kbn/core/server/mocks';
import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/server/mocks';
import { telemetryCollectionManagerPluginMock } from '@kbn/telemetry-collection-manager-plugin/server/mocks';
import { TelemetryPlugin } from './plugin';

describe('TelemetryPlugin', () => {
  describe('setup', () => {
    describe('when initial config does not allow changing opt in status', () => {
      it('calls analytics optIn', () => {
        const initializerContext = coreMock.createPluginInitializerContext({
          optIn: true,
          allowChangingOptInStatus: false,
        });
        const coreSetupMock = coreMock.createSetup();

        new TelemetryPlugin(initializerContext).setup(coreSetupMock, {
          usageCollection: usageCollectionPluginMock.createSetupContract(),
          telemetryCollectionManager: telemetryCollectionManagerPluginMock.createSetupContract(),
        });

        expect(coreSetupMock.analytics.optIn).toHaveBeenCalledTimes(1);
        expect(coreSetupMock.analytics.optIn).toHaveBeenCalledWith({
          global: { enabled: true },
        });
      });
    });

    describe('EBT shipper registration', () => {
      it('registers the Server telemetry shipper', () => {
        const initializerContext = coreMock.createPluginInitializerContext();
        const coreSetupMock = coreMock.createSetup();

        new TelemetryPlugin(initializerContext).setup(coreSetupMock, {
          usageCollection: usageCollectionPluginMock.createSetupContract(),
          telemetryCollectionManager: telemetryCollectionManagerPluginMock.createSetupContract(),
        });

        expect(coreSetupMock.analytics.registerShipper).toHaveBeenCalledWith(
          ElasticV3ServerShipper,
          { channelName: 'kibana-server', version: 'version', sendTo: 'staging' }
        );
      });

      it('registers the Server telemetry shipper (sendTo: production)', () => {
        const initializerContext = coreMock.createPluginInitializerContext({ sendUsageTo: 'prod' });
        const coreSetupMock = coreMock.createSetup();

        new TelemetryPlugin(initializerContext).setup(coreSetupMock, {
          usageCollection: usageCollectionPluginMock.createSetupContract(),
          telemetryCollectionManager: telemetryCollectionManagerPluginMock.createSetupContract(),
        });

        expect(coreSetupMock.analytics.registerShipper).toHaveBeenCalledWith(
          ElasticV3ServerShipper,
          { channelName: 'kibana-server', version: 'version', sendTo: 'production' }
        );
      });
    });
  });
});
