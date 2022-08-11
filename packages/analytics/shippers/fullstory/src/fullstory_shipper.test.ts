/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { fullStoryApiMock } from './fullstory_shipper.test.mocks';
import { FullStoryShipper } from './fullstory_shipper';

describe('FullStoryShipper', () => {
  let fullstoryShipper: FullStoryShipper;

  beforeEach(() => {
    jest.resetAllMocks();
    fullstoryShipper = new FullStoryShipper(
      {
        debug: true,
        fullStoryOrgId: 'test-org-id',
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
        fullstoryShipper.extendContext({ userId });
        expect(fullStoryApiMock.identify).toHaveBeenCalledWith(userId);
      });

      test('calls `identify` again only if the userId changes', () => {
        const userId = 'test-user-id';
        fullstoryShipper.extendContext({ userId });
        expect(fullStoryApiMock.identify).toHaveBeenCalledTimes(1);
        expect(fullStoryApiMock.identify).toHaveBeenCalledWith(userId);

        fullstoryShipper.extendContext({ userId });
        expect(fullStoryApiMock.identify).toHaveBeenCalledTimes(1); // still only called once

        fullstoryShipper.extendContext({ userId: `${userId}-1` });
        expect(fullStoryApiMock.identify).toHaveBeenCalledTimes(2); // called again because the user changed
        expect(fullStoryApiMock.identify).toHaveBeenCalledWith(`${userId}-1`);
      });
    });

    describe('FS.setUserVars', () => {
      test('calls `setUserVars` when isElasticCloudUser: true is provided', () => {
        fullstoryShipper.extendContext({ isElasticCloudUser: true });
        expect(fullStoryApiMock.setUserVars).toHaveBeenCalledWith({
          // eslint-disable-next-line @typescript-eslint/naming-convention
          isElasticCloudUser_bool: true,
        });
      });

      test('calls `setUserVars` when isElasticCloudUser: false is provided', () => {
        fullstoryShipper.extendContext({ isElasticCloudUser: false });
        expect(fullStoryApiMock.setUserVars).toHaveBeenCalledWith({
          // eslint-disable-next-line @typescript-eslint/naming-convention
          isElasticCloudUser_bool: false,
        });
      });
    });

    describe('FS.setVars', () => {
      test('calls `setVars` when version is provided', () => {
        fullstoryShipper.extendContext({ version: '1.2.3' });
        expect(fullStoryApiMock.setVars).toHaveBeenCalledWith('page', {
          version_str: '1.2.3',
          version_major_int: 1,
          version_minor_int: 2,
          version_patch_int: 3,
        });
      });

      test('calls `setVars` when cloudId is provided', () => {
        fullstoryShipper.extendContext({ cloudId: 'test-es-org-id' });
        expect(fullStoryApiMock.setVars).toHaveBeenCalledWith('page', {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          cloudId_str: 'test-es-org-id',
          org_id_str: 'test-es-org-id',
        });
      });

      test('merges both: version and cloudId if both are provided', () => {
        fullstoryShipper.extendContext({ version: '1.2.3', cloudId: 'test-es-org-id' });
        expect(fullStoryApiMock.setVars).toHaveBeenCalledWith('page', {
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
        fullstoryShipper.extendContext(context);
        expect(fullStoryApiMock.setVars).toHaveBeenCalledWith('page', {
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
      fullstoryShipper.optIn(true);
      expect(fullStoryApiMock.consent).toHaveBeenCalledWith(true);
      expect(fullStoryApiMock.restart).toHaveBeenCalled();
    });

    test('should call consent false and shutdown when isOptIn: false', () => {
      fullstoryShipper.optIn(false);
      expect(fullStoryApiMock.consent).toHaveBeenCalledWith(false);
      expect(fullStoryApiMock.shutdown).toHaveBeenCalled();
    });
  });

  describe('reportEvents', () => {
    test('calls the API once per event in the array with the properties transformed', () => {
      fullstoryShipper.reportEvents([
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

      expect(fullStoryApiMock.event).toHaveBeenCalledTimes(2);
      expect(fullStoryApiMock.event).toHaveBeenCalledWith('test-event-1', {
        test_str: 'test-1',
      });
      expect(fullStoryApiMock.event).toHaveBeenCalledWith('test-event-2', {
        other_property_str: 'test-2',
      });
    });

    test('filters the events by the allow-list', () => {
      fullstoryShipper = new FullStoryShipper(
        {
          eventTypesAllowlist: ['valid-event-1', 'valid-event-2'],
          debug: true,
          fullStoryOrgId: 'test-org-id',
        },
        {
          logger: loggerMock.create(),
          sendTo: 'staging',
          isDev: true,
        }
      );
      fullstoryShipper.reportEvents([
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

      expect(fullStoryApiMock.event).toHaveBeenCalledTimes(2);
      expect(fullStoryApiMock.event).toHaveBeenCalledWith('valid-event-1', {
        test_str: 'test-1',
      });
      expect(fullStoryApiMock.event).toHaveBeenCalledWith('valid-event-2', {
        test_str: 'test-2',
      });
    });
  });
});
