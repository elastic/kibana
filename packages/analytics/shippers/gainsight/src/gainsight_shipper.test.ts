/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { gainSightApiMock } from './gainSight_shipper.test.mocks';
import { gainSightShipper } from './gainSight_shipper';

describe('gainSightShipper', () => {
  let gainSightShipper: gainSightShipper;

  beforeEach(() => {
    jest.resetAllMocks();
    gainSightShipper = new gainSightShipper(
      {
        debug: true,
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
    describe('FS.identify', () => {
      test('calls `identify` when the userId is provided', () => {
        const userId = 'test-user-id';
        gainSightShipper.extendContext({ userId });
        expect(gainSightApiMock.identify).toHaveBeenCalledWith(userId);
      });

      test('calls `identify` again only if the userId changes', () => {
        const userId = 'test-user-id';
        gainSightShipper.extendContext({ userId });
        expect(gainSightApiMock.identify).toHaveBeenCalledTimes(1);
        expect(gainSightApiMock.identify).toHaveBeenCalledWith(userId);

        gainSightShipper.extendContext({ userId });
        expect(gainSightApiMock.identify).toHaveBeenCalledTimes(1); // still only called once

        gainSightShipper.extendContext({ userId: `${userId}-1` });
        expect(gainSightApiMock.identify).toHaveBeenCalledTimes(2); // called again because the user changed
        expect(gainSightApiMock.identify).toHaveBeenCalledWith(`${userId}-1`);
      });
    });

    describe('FS.setUserVars', () => {
      test('calls `setUserVars` when isElasticCloudUser: true is provided', () => {
        gainSightShipper.extendContext({ isElasticCloudUser: true });
        expect(gainSightApiMock.setUserVars).toHaveBeenCalledWith({
          // eslint-disable-next-line @typescript-eslint/naming-convention
          isElasticCloudUser_bool: true,
        });
      });

      test('calls `setUserVars` when isElasticCloudUser: false is provided', () => {
        gainSightShipper.extendContext({ isElasticCloudUser: false });
        expect(gainSightApiMock.setUserVars).toHaveBeenCalledWith({
          // eslint-disable-next-line @typescript-eslint/naming-convention
          isElasticCloudUser_bool: false,
        });
      });
    });

    describe('FS.setVars', () => {
      test('calls `setVars` when version is provided', () => {
        gainSightShipper.extendContext({ version: '1.2.3' });
        expect(gainSightApiMock.setVars).toHaveBeenCalledWith('page', {
          version_str: '1.2.3',
          version_major_int: 1,
          version_minor_int: 2,
          version_patch_int: 3,
        });
      });

      test('calls `setVars` when cloudId is provided', () => {
        gainSightShipper.extendContext({ cloudId: 'test-es-org-id' });
        expect(gainSightApiMock.setVars).toHaveBeenCalledWith('page', {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          cloudId_str: 'test-es-org-id',
          org_id_str: 'test-es-org-id',
        });
      });

      test('merges both: version and cloudId if both are provided', () => {
        gainSightShipper.extendContext({ version: '1.2.3', cloudId: 'test-es-org-id' });
        expect(gainSightApiMock.setVars).toHaveBeenCalledWith('page', {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          cloudId_str: 'test-es-org-id',
          org_id_str: 'test-es-org-id',
          version_str: '1.2.3',
          version_major_int: 1,
          version_minor_int: 2,
          version_patch_int: 3,
        });
      });

      test('adds the rest of the context to `setVars`', () => {
        const context = {
          userId: 'test-user-id',
          version: '1.2.3',
          cloudId: 'test-es-org-id',
          foo: 'bar',
        };
        gainSightShipper.extendContext(context);
        expect(gainSightApiMock.setVars).toHaveBeenCalledWith('page', {
          version_str: '1.2.3',
          version_major_int: 1,
          version_minor_int: 2,
          version_patch_int: 3,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          cloudId_str: 'test-es-org-id',
          org_id_str: 'test-es-org-id',
          foo_str: 'bar',
        });
      });
    });
  });

  describe('optIn', () => {
    test('should call consent true and restart when isOptIn: true', () => {
      gainSightShipper.optIn(true);
      expect(gainSightApiMock.consent).toHaveBeenCalledWith(true);
      expect(gainSightApiMock.restart).toHaveBeenCalled();
    });

    test('should call consent false and shutdown when isOptIn: false', () => {
      gainSightShipper.optIn(false);
      expect(gainSightApiMock.consent).toHaveBeenCalledWith(false);
      expect(gainSightApiMock.shutdown).toHaveBeenCalled();
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

      expect(gainSightApiMock.event).toHaveBeenCalledTimes(2);
      expect(gainSightApiMock.event).toHaveBeenCalledWith('test-event-1', {
        test_str: 'test-1',
      });
      expect(gainSightApiMock.event).toHaveBeenCalledWith('test-event-2', {
        other_property_str: 'test-2',
      });
    });

    test('filters the events by the allow-list', () => {
      gainSightShipper = new gainSightShipper(
        {
          eventTypesAllowlist: ['valid-event-1', 'valid-event-2'],
          debug: true,
          gainSightOrgId: 'test-org-id',
        },
        {
          logger: loggerMock.create(),
          sendTo: 'staging',
          isDev: true,
        }
      );
      gainSightShipper.reportEvents([
        {
          event_type: 'test-event-1', // Should be filtered out.
          timestamp: '2020-01-01T00:00:00.000Z',
          properties: { test: 'test-1' },
          context: { pageName: 'test-page-1' },
        },
        {
          event_type: 'valid-event-1',
          timestamp: '2020-01-01T00:00:00.000Z',
          properties: { test: 'test-1' },
          context: { pageName: 'test-page-1' },
        },
        {
          event_type: 'valid-event-2',
          timestamp: '2020-01-01T00:00:00.000Z',
          properties: { test: 'test-2' },
          context: { pageName: 'test-page-1' },
        },
      ]);

      expect(gainSightApiMock.event).toHaveBeenCalledTimes(2);
      expect(gainSightApiMock.event).toHaveBeenCalledWith('valid-event-1', {
        test_str: 'test-1',
      });
      expect(gainSightApiMock.event).toHaveBeenCalledWith('valid-event-2', {
        test_str: 'test-2',
      });
    });
  });
});
