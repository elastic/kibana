/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable dot-notation */
import { fakeSchedulers } from 'rxjs-marbles/jest';
import { coreMock } from '@kbn/core/server/mocks';
import {
  telemetryCollectionManagerPluginMock,
  Setup,
} from '@kbn/telemetry-collection-manager-plugin/server/mocks';

jest.mock('rxjs', () => {
  const RxJs = jest.requireActual('rxjs');
  return {
    ...RxJs,
    // Redefining timer as a merge of timer and interval because `fakeSchedulers` fails to advance on the intervals
    timer: (dueTime: number, interval: number) =>
      RxJs.merge(RxJs.timer(dueTime), RxJs.interval(interval)),
  };
});

import { fetchMock, getNextAttemptDateMock } from './fetcher.test.mock';
import { FetcherTask } from './fetcher';

describe('FetcherTask', () => {
  beforeEach(() => jest.useFakeTimers({ legacyFakeTimers: true }));

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

  describe('Validate connectivity', () => {
    let fetcherTask: FetcherTask;
    let getCurrentConfigs: jest.Mock;
    let updateReportFailure: jest.Mock;

    beforeEach(() => {
      getCurrentConfigs = jest.fn();
      updateReportFailure = jest.fn();
      fetcherTask = new FetcherTask(coreMock.createPluginInitializerContext({}));
      Object.assign(fetcherTask, { getCurrentConfigs, updateReportFailure });
    });

    afterEach(() => {
      fetchMock.mockReset();
    });

    test(
      'Validates connectivity and sets as online when the OPTIONS request succeeds',
      fakeSchedulers(async (advance) => {
        expect(fetcherTask['isOnline$'].value).toBe(false);
        getCurrentConfigs.mockResolvedValue({
          telemetryOptIn: true,
          telemetrySendUsageFrom: 'server',
          failureCount: 0,
          telemetryUrl: 'test-url',
        });
        fetchMock.mockResolvedValue({});
        const subscription = fetcherTask['validateConnectivity']();
        advance(5 * 60 * 1000);
        await new Promise((resolve) => process.nextTick(resolve)); // Wait for the promise to fulfill
        expect(getCurrentConfigs).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith('test-url', { method: 'options' });
        expect(fetcherTask['isOnline$'].value).toBe(true);
        subscription.unsubscribe();
      })
    );

    test(
      'Skips validation when already set as online',
      fakeSchedulers(async (advance) => {
        fetcherTask['isOnline$'].next(true);
        const subscription = fetcherTask['validateConnectivity']();
        advance(5 * 60 * 1000);
        await new Promise((resolve) => process.nextTick(resolve)); // Wait for the promise to fulfill
        expect(getCurrentConfigs).toHaveBeenCalledTimes(0);
        expect(fetchMock).toHaveBeenCalledTimes(0);
        expect(fetcherTask['isOnline$'].value).toBe(true);
        subscription.unsubscribe();
      })
    );

    test(
      'Retries on errors',
      fakeSchedulers(async (advance) => {
        expect(fetcherTask['isOnline$'].value).toBe(false);
        getCurrentConfigs.mockResolvedValue({
          telemetryOptIn: true,
          telemetrySendUsageFrom: 'server',
          failureCount: 0,
          telemetryUrl: 'test-url',
        });
        fetchMock.mockRejectedValue(new Error('Something went terribly wrong'));
        const subscription = fetcherTask['validateConnectivity']();
        advance(5 * 60 * 1000);
        await new Promise((resolve) => process.nextTick(resolve)); // Wait for the promise to fulfill
        expect(getCurrentConfigs).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(updateReportFailure).toHaveBeenCalledTimes(1);
        expect(fetcherTask['isOnline$'].value).toBe(false);

        // Try again after 12 hours
        fetchMock.mockResolvedValue({});
        advance(12 * 60 * 60 * 1000);
        await new Promise((resolve) => process.nextTick(resolve)); // Wait for the promise to fulfill
        expect(getCurrentConfigs).toHaveBeenCalledTimes(2);
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(updateReportFailure).toHaveBeenCalledTimes(1);
        expect(fetcherTask['isOnline$'].value).toBe(true);

        subscription.unsubscribe();
      })
    );

    test(
      'Should not retry if it hit the max number of failures for this version',
      fakeSchedulers(async (advance) => {
        expect(fetcherTask['isOnline$'].value).toBe(false);
        getCurrentConfigs.mockResolvedValue({
          telemetryOptIn: true,
          telemetrySendUsageFrom: 'server',
          failureCount: 3,
          failureVersion: 'version',
          currentVersion: 'version',
          telemetryUrl: 'test-url',
        });
        const subscription = fetcherTask['validateConnectivity']();
        advance(5 * 60 * 1000);
        await new Promise((resolve) => process.nextTick(resolve)); // Wait for the promise to fulfill
        expect(getCurrentConfigs).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledTimes(0);
        expect(fetcherTask['isOnline$'].value).toBe(false);

        subscription.unsubscribe();
      })
    );

    test(
      'Should retry if it hit the max number of failures for a different version',
      fakeSchedulers(async (advance) => {
        expect(fetcherTask['isOnline$'].value).toBe(false);
        getCurrentConfigs.mockResolvedValue({
          telemetryOptIn: true,
          telemetrySendUsageFrom: 'server',
          failureCount: 3,
          failureVersion: 'version',
          currentVersion: 'another_version',
          telemetryUrl: 'test-url',
        });
        const subscription = fetcherTask['validateConnectivity']();
        advance(5 * 60 * 1000);
        await new Promise((resolve) => process.nextTick(resolve)); // Wait for the promise to fulfill
        expect(getCurrentConfigs).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetcherTask['isOnline$'].value).toBe(true);

        subscription.unsubscribe();
      })
    );
  });

  describe('startSendIfDueSubscription', () => {
    let fetcherTask: FetcherTask;
    let sendIfDue: jest.Mock;

    beforeEach(() => {
      sendIfDue = jest.fn().mockResolvedValue({});
      fetcherTask = new FetcherTask(coreMock.createPluginInitializerContext({}));
      Object.assign(fetcherTask, { sendIfDue });
    });

    afterEach(() => {
      getNextAttemptDateMock.mockReset();
    });

    test('Tries to send telemetry when it is online', () => {
      const subscription = fetcherTask['startSendIfDueSubscription']();
      fetcherTask['isOnline$'].next(true);
      expect(sendIfDue).toHaveBeenCalledTimes(1);
      subscription.unsubscribe();
    });

    test('Does not send telemetry when it is offline', () => {
      const subscription = fetcherTask['startSendIfDueSubscription']();
      fetcherTask['isOnline$'].next(false);
      expect(sendIfDue).toHaveBeenCalledTimes(0);
      subscription.unsubscribe();
    });

    test(
      'Sends telemetry when the next attempt date kicks in',
      fakeSchedulers((advance) => {
        fetcherTask['isOnline$'].next(true);
        const subscription = fetcherTask['startSendIfDueSubscription']();
        const lastReported = Date.now();
        getNextAttemptDateMock.mockReturnValue(new Date(lastReported + 1000));
        fetcherTask['lastReported$'].next(lastReported);
        advance(1000);
        expect(sendIfDue).toHaveBeenCalledTimes(1);
        subscription.unsubscribe();
      })
    );

    test(
      'Keeps retrying every 1 minute after the next attempt date until a new emission of lastReported occurs',
      fakeSchedulers(async (advance) => {
        fetcherTask['isOnline$'].next(true);
        const subscription = fetcherTask['startSendIfDueSubscription']();
        const lastReported = Date.now();
        getNextAttemptDateMock.mockReturnValue(new Date(lastReported + 1000));
        fetcherTask['lastReported$'].next(lastReported);
        advance(1000);
        await new Promise((resolve) => process.nextTick(resolve));
        expect(sendIfDue).toHaveBeenCalledTimes(1);
        advance(60 * 1000);
        await new Promise((resolve) => process.nextTick(resolve));
        expect(sendIfDue).toHaveBeenCalledTimes(2);
        advance(60 * 1000);
        await new Promise((resolve) => process.nextTick(resolve));
        expect(sendIfDue).toHaveBeenCalledTimes(3);
        subscription.unsubscribe();
      })
    );
  });
});
