/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { gainSightApiMock } from './gainsight_shipper.test.mocks';
import { GainSightShipper } from './gainsight_shipper';

describe('gainSightShipper', () => {
  let gainSightShipper: GainSightShipper;

  beforeEach(() => {
    jest.resetAllMocks();
    gainSightShipper = new GainSightShipper(
      {
        gainSightOrgId: 'test-org-id',
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
      test('calls `identify` when the userId is provided', () => {
        const userId = 'test-user-id';
        const clusterName = '123654';
        gainSightShipper.extendContext({ userId, cluster_name: clusterName });
        expect(gainSightApiMock).toHaveBeenCalledWith('identify', {
          id: clusterName,
          userType: 'deployment',
        });
      });

      test('calls `identify` again only if the userId changes', () => {
        const userId = 'test-user-id';
        const clusterName = '123654';
        gainSightShipper.extendContext({ userId, cluster_name: clusterName });
        expect(gainSightApiMock).toHaveBeenCalledTimes(2);
        expect(gainSightApiMock).toHaveBeenCalledWith('identify', {
          id: clusterName,
          userType: 'deployment',
        });

        gainSightShipper.extendContext({ userId, cluster_name: clusterName });
        expect(gainSightApiMock).toHaveBeenCalledTimes(2);

        gainSightShipper.extendContext({ userId: `${userId}-1`, cluster_name: clusterName });
        expect(gainSightApiMock).toHaveBeenCalledTimes(4); // called again because the user changed
      });
    });
  });

  describe('optIn', () => {
    test('should call consent true and restart when isOptIn: true', () => {
      gainSightShipper.optIn(true);
      expect(gainSightApiMock).toHaveBeenCalledWith('config', 'enableTag', true);
    });

    test('should call consent false and shutdown when isOptIn: false', () => {
      gainSightShipper.optIn(false);
      expect(gainSightApiMock).toHaveBeenCalledWith('config', 'enableTag', false);
    });
  });

  describe('reportEvents', () => {
    test('calls the API once per event in the array with the properties transformed', () => {
      gainSightShipper.reportEvents([
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

      expect(gainSightApiMock).toHaveBeenCalledTimes(2);
      expect(gainSightApiMock).toHaveBeenCalledWith('track', 'test-event-1', {
        test_str: 'test-1',
      });
      expect(gainSightApiMock).toHaveBeenCalledWith('track', 'test-event-2', {
        other_property_str: 'test-2',
      });
    });
  });
});
