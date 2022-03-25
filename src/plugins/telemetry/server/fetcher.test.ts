/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable dot-notation */
import { FetcherTask } from './fetcher';
import { coreMock } from '../../../core/server/mocks';

describe('FetcherTask', () => {
  describe('sendIfDue', () => {
    it('stops when it fails to get telemetry configs', async () => {
      const initializerContext = coreMock.createPluginInitializerContext({});
      const fetcherTask = new FetcherTask(initializerContext);
      const mockError = new Error('Some message.');
      const getCurrentConfigs = jest.fn().mockRejectedValue(mockError);
      const fetchTelemetry = jest.fn();
      const sendTelemetry = jest.fn();
      Object.assign(fetcherTask, {
        getCurrentConfigs,
        fetchTelemetry,
        sendTelemetry,
      });
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
      const initializerContext = coreMock.createPluginInitializerContext({});
      const fetcherTask = new FetcherTask(initializerContext);
      const mockTelemetryUrl = 'mock_telemetry_url';
      const mockClusters = [
        { clusterUuid: 'mk_uuid_1', stats: 'cluster_1' },
        { clusterUuid: 'mk_uuid_2', stats: 'cluster_2' },
      ];

      const getCurrentConfigs = jest.fn().mockResolvedValue({
        telemetryUrl: mockTelemetryUrl,
      });
      const shouldSendReport = jest.fn().mockReturnValue(true);

      const fetchTelemetry = jest.fn().mockResolvedValue(mockClusters);
      const sendTelemetry = jest.fn();
      const updateReportFailure = jest.fn();

      Object.assign(fetcherTask, {
        getCurrentConfigs,
        shouldSendReport,
        fetchTelemetry,
        updateReportFailure,
        sendTelemetry,
      });

      await fetcherTask['sendIfDue']();

      expect(fetchTelemetry).toBeCalledTimes(1);
      expect(sendTelemetry).toBeCalledTimes(1);
      expect(sendTelemetry).toHaveBeenNthCalledWith(1, mockTelemetryUrl, mockClusters);
      expect(updateReportFailure).toBeCalledTimes(0);
    });
  });
});
