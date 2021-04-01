/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

jest.mock('node-fetch', () => jest.fn().mockResolvedValue({ status: 200, ok: true }));

import { loggingSystemMock, coreMock } from '../../../../core/server/mocks';

import fetch from 'node-fetch';
import { ByteSizeValue } from '@kbn/config-schema';
import moment from 'moment';
import { EventBasedTelemetryService } from './event_based_telemetry_service';
import type { TelemetryRootSchema } from '../../common/schema';

describe('EventBasedTelemetryService', () => {
  jest.useFakeTimers();
  const logger = loggingSystemMock.createLogger();

  const config = {
    isDev: true,
    kibanaVersion: '0.0.0',
    getIsOptedIn: jest.fn().mockResolvedValue(true),
    telemetryUrl: new URL('http://telemetry.test'),
    plugin_size_quota_in_bytes: ByteSizeValue.parse('1mb'),
    refresh_cluster_ids_interval: moment.duration(1, 'minute'),
    leaky_bucket: {
      threshold: ByteSizeValue.parse('100kb'),
      max_frequency_of_requests: moment.duration(1, 'second'),
      interval: moment.duration(30, 'minutes'),
      max_wait_time: moment.duration(1, 'hour'),
      max_retries: 2,
    },
  };

  const eventBasedTelemetryService = new EventBasedTelemetryService(logger, config);

  afterEach(() => {
    logger.info.mockClear();
  });

  afterAll(() => {
    eventBasedTelemetryService.stop();
  });

  describe('no channels registered', () => {
    const service = new EventBasedTelemetryService(logger, config);
    const esClient = coreMock.createStart().elasticsearch.client.asInternalUser;

    test('it should not enqueue any events', () => {
      expect(service.sendToChannel('test_plugin', 'unregistered-channel', [{ test: 'ok' }])).toBe(
        false
      );
      expect(logger.info).not.toHaveBeenCalled();
    });

    test('it should not fail to start', () => {
      expect(() => service.start(esClient)).not.toThrow();
    });

    test('the leaky bucket should attempt to send an empty array', async () => {
      // eslint-disable-next-line dot-notation
      service['leakyBucket']['lastSend'] = moment('1970-01-01T00:00:00.000Z'); // It's been too long without sending

      // eslint-disable-next-line dot-notation
      const sender = jest.fn().mockImplementation((events) => service['sendHttpRequest'](events));

      // eslint-disable-next-line dot-notation
      await service['leakyBucket'].sendIfDue(sender);

      expect(sender).toHaveBeenCalledWith([]);
      expect(fetch).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith('Sending 0 events...');
    });
  });

  describe('the channel is registered', () => {
    const service = new EventBasedTelemetryService(logger, config);

    const esClient = coreMock.createStart().elasticsearch.client.asInternalUser;

    test('but the queue is not assigned yet', () => {
      service.registerChannel('test_plugin', {
        name: 'my-channel',
        schema: {
          test: { type: 'keyword', _meta: { description: 'Always OK because tests never fail' } },
        },
      });

      // Checking the validator is registered for the channel
      expect(
        // eslint-disable-next-line dot-notation
        service['queues'].get('test_plugin')?.get('my-channel')
      ).toHaveProperty('validator');

      // Checking that the queue has not been assigned yet
      expect(
        // eslint-disable-next-line dot-notation
        service['queues'].get('test_plugin')?.get('my-channel')
      ).not.toHaveProperty('queue');

      // Does not enqueue anything because there's no queue yet
      expect(
        service.sendToChannel('test_plugin', 'my-channel', [
          { test: 'ok' },
          { test: 123 },
          { test: {} },
          { other_field: 'ok' },
        ])
      ).toBe(false);
    });

    test('once started', () => {
      service.start(esClient);

      expect(() =>
        service.registerChannel('test_plugin', {
          name: 'my-channel',
          schema: {
            test: { type: 'keyword', _meta: { description: 'Always OK because tests never fail' } },
          },
        })
      ).toThrowError('Channels can only be registered during the setup lifecycle step.');

      // Checking the validator is registered for the channel
      expect(
        // eslint-disable-next-line dot-notation
        service['queues'].get('test_plugin')?.get('my-channel')
      ).toHaveProperty('validator');

      // Checking that the queue is now assigned
      expect(
        // eslint-disable-next-line dot-notation
        service['queues'].get('test_plugin')?.get('my-channel')
      ).toHaveProperty('queue');

      // Enqueues only the first event because the rest don't pass validation
      expect(
        service.sendToChannel('test_plugin', 'my-channel', [
          { test: 'ok' },
          { test: 123 },
          { test: {} },
          { other_field: 'ok' },
        ])
      ).toBe(true);
      expect(logger.info).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith(`Enqueued event ${JSON.stringify({ test: 'ok' })}`);
      // Logging validation errors for each invalid event
      expect(logger.error).toHaveBeenCalledTimes(3);

      // Sends one event that passes validation
      expect(service.sendToChannel('test_plugin', 'my-channel', [{ test: 'ok' }])).toBe(true);
      expect(logger.info).toHaveBeenCalledTimes(2);

      // Does not send any event because none pass validation
      expect(
        service.sendToChannel('test_plugin', 'my-channel', [
          { test: 123 },
          { test: {} },
          { other_field: 'ok' },
        ])
      ).toBe(false);

      // Even when valid, it refuses to enqueue because it's opted-out
      // eslint-disable-next-line dot-notation
      service['isOptedIn'] = false;
      expect(service.sendToChannel('test_plugin', 'my-channel', [{ test: 'ok' }])).toBe(false);
    });

    test('should fill all the common values in the cache and start filling up the leaky bucket', async () => {
      // eslint-disable-next-line dot-notation
      expect(service['licenseId']).toBeUndefined();

      // Messages are still in the channel queues
      expect(
        // eslint-disable-next-line dot-notation
        service['queues'].get('test_plugin')?.get('my-channel')?.queue?.size
      ).toBeGreaterThan(0);

      esClient.license.get = jest
        .fn()
        .mockResolvedValue({ body: { license: { uid: 'license_uuid' } } });
      esClient.info = jest.fn().mockResolvedValue({
        body: {
          cluster_uuid: 'clusterUuid',
          cluster_name: 'clusterName',
          version: { number: '0.0.0' },
        },
      });

      // eslint-disable-next-line dot-notation
      await service['cacheCommonValues'](esClient);

      // eslint-disable-next-line dot-notation
      expect(service['licenseId']).toBe('license_uuid');
      // eslint-disable-next-line dot-notation
      expect(service['isOptedIn']).toBe(true);

      // The channel queues are empty now...
      expect(
        // eslint-disable-next-line dot-notation
        service['queues'].get('test_plugin')?.get('my-channel')?.queue?.size
      ).toBe(0);

      // ... because the events are now in the leaky-bucket's queue
      // eslint-disable-next-line dot-notation
      expect(service['leakyBucket']['queue'].length).toBe(2);
    });

    test('the leaky bucket should attempt to send', async () => {
      // eslint-disable-next-line dot-notation
      expect(service['leakyBucket']['queue'].length).toBe(2);

      // eslint-disable-next-line dot-notation
      service['leakyBucket']['lastSend'] = moment('1970-01-01T00:00:00.000Z'); // It's been too long without sending

      const sender = jest.fn().mockImplementation((events) => {
        expect(events.length).toBe(2);
        // eslint-disable-next-line dot-notation
        return service['sendHttpRequest'](events);
      });

      // eslint-disable-next-line dot-notation
      await service['leakyBucket'].sendIfDue(sender);

      expect(sender).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(
        `Sending 2 events to http://telemetry.test/v3/send/kibana-events`
      );
      // eslint-disable-next-line dot-notation
      expect(service['leakyBucket']['queue'].length).toBe(0);
    });

    test('the leaky bucket should have nothing to send', async () => {
      expect(
        // eslint-disable-next-line dot-notation
        service['queues'].get('test_plugin')?.get('my-channel')?.queue?.size
      ).toBe(0);

      // eslint-disable-next-line dot-notation
      service['leakyBucket']['lastSend'] = moment('1970-01-01T00:00:00.000Z'); // It's been too long without sending

      // eslint-disable-next-line dot-notation
      await service['leakyBucket'].sendIfDue((events) => service['sendHttpRequest'](events));

      expect(fetch).toHaveBeenCalledTimes(1); // Still the count from before
    });

    test('timers should trigger a send as well', async () => {
      expect(
        // eslint-disable-next-line dot-notation
        service['queues'].get('test_plugin')?.get('my-channel')?.queue?.size
      ).toBe(0);

      // eslint-disable-next-line dot-notation
      service['leakyBucket']['lastSend'] = moment('1970-01-01T00:00:00.000Z'); // It's been too long without sending

      expect(service.sendToChannel('test_plugin', 'my-channel', [{ test: 'ok' }])).toBe(true);

      jest.runTimersToTime(60 * 60 * 1000);

      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Quota split', () => {
    test('register multiple channels for the same plugin', () => {
      const service = new EventBasedTelemetryService(logger, config);
      const testSchema: TelemetryRootSchema = {
        test: { type: 'keyword', _meta: { description: 'Always OK because tests never fail' } },
      };

      const pluginName = 'quota_test_plugin';

      service.registerChannel(pluginName, {
        name: 'custom-quota-channel',
        schema: testSchema,
        quotaPercentage: 0.5,
      });

      service.registerChannel(pluginName, {
        name: 'even-quota-channel-one',
        schema: testSchema,
      });

      service.registerChannel(pluginName, {
        name: 'even-quota-channel-two',
        schema: testSchema,
      });

      service.start(coreMock.createStart().elasticsearch.client.asInternalUser);

      // eslint-disable-next-line dot-notation
      const pluginQueues = service['queues'].get(pluginName)!;
      expect(
        // eslint-disable-next-line dot-notation
        pluginQueues.get('custom-quota-channel')?.queue!['maxByteSize']
      ).toBe(config.plugin_size_quota_in_bytes.getValueInBytes() / 2);
      expect(
        // eslint-disable-next-line dot-notation
        pluginQueues.get('even-quota-channel-one')?.queue!['maxByteSize']
      ).toBe(config.plugin_size_quota_in_bytes.getValueInBytes() / 4);
      expect(
        // eslint-disable-next-line dot-notation
        pluginQueues.get('even-quota-channel-two')?.queue!['maxByteSize']
      ).toBe(config.plugin_size_quota_in_bytes.getValueInBytes() / 4);
    });

    describe('Over-assigning quotas', () => {
      const { elasticsearch } = coreMock.createStart();

      test('50% + 60%', () => {
        const service = new EventBasedTelemetryService(logger, config);
        const pluginName = 'quota_test_plugin';
        const testSchema: TelemetryRootSchema = {
          test: { type: 'keyword', _meta: { description: 'Always OK because tests never fail' } },
        };

        service.registerChannel(pluginName, {
          name: 'half-quota-channel-one',
          schema: testSchema,
          quotaPercentage: 0.5,
        });

        service.registerChannel(pluginName, {
          name: 'sixty-percent-quota-channel-two',
          schema: testSchema,
          quotaPercentage: 0.6,
        });

        expect(() => service.start(elasticsearch.client.asInternalUser)).toThrowError(
          `The plugin "${pluginName}" is over-assigning memory to its Event-telemetry channels.`
        );
      });

      test('2 50% + 1 with any', () => {
        const service = new EventBasedTelemetryService(logger, config);
        const pluginName = 'quota_test_plugin';
        const testSchema: TelemetryRootSchema = {
          test: { type: 'keyword', _meta: { description: 'Always OK because tests never fail' } },
        };

        service.registerChannel(pluginName, {
          name: 'half-quota-channel-one',
          schema: testSchema,
          quotaPercentage: 0.5,
        });

        service.registerChannel(pluginName, {
          name: 'half-quota-channel-two',
          schema: testSchema,
          quotaPercentage: 0.5,
        });

        service.registerChannel(pluginName, {
          name: 'any-quota-channel',
          schema: testSchema,
        });

        expect(() => service.start(elasticsearch.client.asInternalUser)).toThrowError(
          `The plugin "${pluginName}" is over-assigning memory to its Event-telemetry channels.`
        );
      });
    });
  });
});
