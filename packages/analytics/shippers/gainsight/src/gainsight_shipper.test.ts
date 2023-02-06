/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { gainsightApiMock } from './gainsight_shipper.test.mocks';
import { GainsightShipper } from './gainsight_shipper';

describe('gainsightShipper', () => {
  let gainsightShipper: GainsightShipper;

  beforeEach(() => {
    jest.resetAllMocks();
    gainsightShipper = new GainsightShipper(
      {
        gainsightOrgId: 'test-org-id',
      },
      {
        logger: loggerMock.create(),
        sendTo: 'staging',
        isDev: true,
      }
    );
  });

  describe('extendContext', () => {
    describe('identify', () => {
      test('calls `identify` when the clusterName is provided', () => {
        const userId = 'test-user-id';
        const clusterName = '123654';
        gainsightShipper.extendContext({ userId, cluster_name: clusterName });
        expect(gainsightApiMock).toHaveBeenCalledWith('identify', {
          id: clusterName,
          userType: 'deployment',
        });
      });

      test('calls `identify` again only if the clusterName changes', () => {
        const userId = 'test-user-id';
        const clusterName = '123654';
        gainsightShipper.extendContext({ userId, cluster_name: clusterName });
        expect(gainsightApiMock).toHaveBeenCalledTimes(2);
        expect(gainsightApiMock).toHaveBeenCalledWith('identify', {
          id: clusterName,
          userType: 'deployment',
        });
        expect(gainsightApiMock).toHaveBeenCalledWith('set', 'globalContext', {
          kibanaUserId: userId,
        });

        gainsightShipper.extendContext({ userId, cluster_name: clusterName });
        expect(gainsightApiMock).toHaveBeenCalledTimes(3);

        gainsightShipper.extendContext({ userId, cluster_name: `${clusterName}-1` });
        expect(gainsightApiMock).toHaveBeenCalledTimes(5); // called again because the user changed
      });
    });
  });

  describe('optIn', () => {
    test('should call consent true and restart when isOptIn: true', () => {
      gainsightShipper.optIn(true);
      expect(gainsightApiMock).toHaveBeenCalledWith('config', 'enableTag', true);
    });

    test('should call consent false and shutdown when isOptIn: false', () => {
      gainsightShipper.optIn(false);
      expect(gainsightApiMock).toHaveBeenCalledWith('config', 'enableTag', false);
    });
  });

  describe('reportEvents', () => {
    test('calls the API once per event in the array with the properties transformed', () => {
      gainsightShipper.reportEvents([
        {
          event_type: 'test-event-1',
          timestamp: '2020-01-01T00:00:00.000Z',
          properties: { test: 'test-1' },
          context: { pageName: 'test-page-1' },
        },
        {
          event_type: 'test-event-2',
          timestamp: '2020-01-01T00:00:00.000Z',
          properties: { other_property: 'test-2' },
          context: { pageName: 'test-page-1' },
        },
      ]);

      expect(gainsightApiMock).toHaveBeenCalledTimes(2);
      expect(gainsightApiMock).toHaveBeenCalledWith('track', 'test-event-1', {
        test: 'test-1',
      });
      expect(gainsightApiMock).toHaveBeenCalledWith('track', 'test-event-2', {
        other_property: 'test-2',
      });
    });
  });
});
