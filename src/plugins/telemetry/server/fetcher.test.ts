/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable dot-notation */
import { FetcherTask } from './fetcher';
import { coreMock } from '@kbn/core/server/mocks';
import {
  telemetryCollectionManagerPluginMock,
  Setup,
} from '@kbn/telemetry-collection-manager-plugin/server/mocks';

describe('FetcherTask', () => {
  describe('sendIfDue', () => {
    let getCurrentConfigs: jest.Mock;
    let shouldSendReport: jest.Mock;
    let fetchTelemetry: jest.Mock;
    let sendTelemetry: jest.Mock;
    let updateReportFailure: jest.Mock;
    let telemetryCollectionManagerMock: Setup;
    let fetcherTask: FetcherTask;

    beforeEach(() => {
      getCurrentConfigs = jest.fn();
      shouldSendReport = jest.fn();
      fetchTelemetry = jest.fn();
      sendTelemetry = jest.fn();
      updateReportFailure = jest.fn();

      const initializerContext = coreMock.createPluginInitializerContext({});
      fetcherTask = new FetcherTask(initializerContext);

      telemetryCollectionManagerMock = telemetryCollectionManagerPluginMock.createSetupContract();
      telemetryCollectionManagerMock.shouldGetTelemetry.mockResolvedValue(true);
      fetcherTask['telemetryCollectionManager'] = telemetryCollectionManagerMock;

      Object.assign(fetcherTask, {
        getCurrentConfigs,
        shouldSendReport,
        fetchTelemetry,
        updateReportFailure,
        sendTelemetry,
      });
    });

    it('stops when Kibana is not ready to fetch telemetry', async () => {
      const mockError = new Error('Some message.');
      getCurrentConfigs.mockRejectedValue(mockError);
      telemetryCollectionManagerMock.shouldGetTelemetry.mockResolvedValue(false);

      const result = await fetcherTask['sendIfDue']();
      expect(result).toBe(undefined);
      expect(getCurrentConfigs).toBeCalledTimes(0);
      expect(fetchTelemetry).toBeCalledTimes(0);
      expect(sendTelemetry).toBeCalledTimes(0);
      expect(fetcherTask['logger'].warn).toBeCalledTimes(0);
    });

    it('stops when it fails to get telemetry configs', async () => {
      const mockError = new Error('Some message.');
      getCurrentConfigs.mockRejectedValue(mockError);
      const result = await fetcherTask['sendIfDue']();
      expect(result).toBe(undefined);
      expect(getCurrentConfigs).toBeCalledTimes(1);
      expect(fetchTelemetry).toBeCalledTimes(0);
      expect(sendTelemetry).toBeCalledTimes(0);
      expect(fetcherTask['logger'].warn).toBeCalledTimes(1);
      expect(fetcherTask['logger'].warn).toHaveBeenCalledWith(
        `Error getting telemetry configs. (${mockError})`
      );
    });

    it('fetches usage and send telemetry', async () => {
      const mockTelemetryUrl = 'mock_telemetry_url';
      const mockClusters = [
        { clusterUuid: 'mk_uuid_1', stats: 'cluster_1' },
        { clusterUuid: 'mk_uuid_2', stats: 'cluster_2' },
      ];

      getCurrentConfigs.mockResolvedValue({
        telemetryUrl: mockTelemetryUrl,
      });
      shouldSendReport.mockReturnValue(true);
      fetchTelemetry.mockResolvedValue(mockClusters);

      await fetcherTask['sendIfDue']();

      expect(fetchTelemetry).toBeCalledTimes(1);
      expect(sendTelemetry).toBeCalledTimes(1);
      expect(sendTelemetry).toHaveBeenNthCalledWith(1, mockTelemetryUrl, mockClusters);
      expect(updateReportFailure).toBeCalledTimes(0);
    });
  });
});
