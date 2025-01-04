/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable dot-notation */
import { ElasticV3ServerShipper } from '@elastic/ebt/shippers/elastic_v3/server';
import { coreMock } from '@kbn/core/server/mocks';
import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/server/mocks';
import { telemetryCollectionManagerPluginMock } from '@kbn/telemetry-collection-manager-plugin/server/mocks';
import { buildShipperHeaders } from '../common/ebt_v3_endpoint';
import { TelemetryPlugin } from './plugin';
import type { NodeRoles } from '@kbn/core-node-server';

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

        const telemetryPlugin = new TelemetryPlugin(initializerContext);
        telemetryPlugin['getSendToEnv'] = jest.fn();

        telemetryPlugin.setup(coreSetupMock, {
          usageCollection: usageCollectionPluginMock.createSetupContract(),
          telemetryCollectionManager: telemetryCollectionManagerPluginMock.createSetupContract(),
        });

        expect(telemetryPlugin['getSendToEnv']).toHaveBeenCalledTimes(1);
        expect(telemetryPlugin['getSendToEnv']).toHaveBeenCalledWith(undefined);

        expect(coreSetupMock.analytics.registerShipper).toHaveBeenCalledWith(
          ElasticV3ServerShipper,
          {
            channelName: 'kibana-server',
            version: 'version',
            buildShipperUrl: expect.any(Function),
            buildShipperHeaders,
          }
        );
      });

      it('registers the Server telemetry shipper (sendTo: production)', () => {
        const initializerContext = coreMock.createPluginInitializerContext({ sendUsageTo: 'prod' });
        const coreSetupMock = coreMock.createSetup();

        const telemetryPlugin = new TelemetryPlugin(initializerContext);
        telemetryPlugin['getSendToEnv'] = jest.fn();

        telemetryPlugin.setup(coreSetupMock, {
          usageCollection: usageCollectionPluginMock.createSetupContract(),
          telemetryCollectionManager: telemetryCollectionManagerPluginMock.createSetupContract(),
        });

        expect(telemetryPlugin['getSendToEnv']).toHaveBeenCalledTimes(1);
        expect(telemetryPlugin['getSendToEnv']).toHaveBeenCalledWith('prod');

        expect(coreSetupMock.analytics.registerShipper).toHaveBeenCalledWith(
          ElasticV3ServerShipper,
          {
            channelName: 'kibana-server',
            version: 'version',
            buildShipperUrl: expect.any(Function),
            buildShipperHeaders,
          }
        );
      });
    });
  });

  describe('start', () => {
    describe('per node behavior', () => {
      function createPluginForNodeRole(roles: Partial<NodeRoles>) {
        const initializerContext = coreMock.createPluginInitializerContext();
        initializerContext.node.roles = { ...initializerContext.node.roles, ...roles };

        const plugin = new TelemetryPlugin(initializerContext);

        const startFetcherMock = (plugin['startFetcher'] = jest.fn());

        plugin.setup(coreMock.createSetup(), {
          usageCollection: usageCollectionPluginMock.createSetupContract(),
          telemetryCollectionManager: telemetryCollectionManagerPluginMock.createSetupContract(),
        });

        plugin.start(coreMock.createStart(), {
          telemetryCollectionManager: telemetryCollectionManagerPluginMock.createStartContract(),
        });

        return { startFetcherMock };
      }

      afterEach(() => {
        jest.resetAllMocks();
      });

      it('calls startFetcher when it is a UI node', () => {
        const { startFetcherMock } = createPluginForNodeRole({ ui: true });
        expect(startFetcherMock).toHaveBeenCalledTimes(1);
      });

      it('does not call startFetcher when not a UI node', () => {
        const { startFetcherMock } = createPluginForNodeRole({ ui: false });
        expect(startFetcherMock).toHaveBeenCalledTimes(0);
      });
    });
  });
});
