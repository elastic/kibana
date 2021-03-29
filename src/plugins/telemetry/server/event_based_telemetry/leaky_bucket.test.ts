/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import { loggingSystemMock } from '../../../../core/server/mocks';
import { LeakyBucket } from './leaky_bucket';
import type { EventEnvelope, LeakyBucketConfig } from './types';
import { ByteSizeValue } from '@kbn/config-schema';
import { Subject } from 'rxjs';

function generateEventEnvelope(): EventEnvelope {
  return {
    cluster_uuid: 'clusterUuid',
    cluster_name: 'clusterName',
    version: '0.0.0',
    licenseId: 'licenseId',
    timestamp: new Date().toISOString(),
    plugin_name: 'pluginName',
    channel_name: 'channelName',
    test: { ok: true },
  };
}

describe('LeakyBucket', () => {
  const logger = loggingSystemMock.createLogger();

  const leakyBucketConfig: LeakyBucketConfig = {
    threshold: ByteSizeValue.parse('100kb'),
    max_frequency_of_requests: moment.duration(1, 'second'),
    interval: moment.duration(100, 'milliseconds'),
    max_wait_time: moment.duration(1, 'hour'),
    max_retries: 2,
  };

  const newEvents$ = new Subject<number>();

  afterEach(() => {
    logger.debug.mockClear();
  });

  test('starts timer for sender and sends a full queue', () => {
    expect.assertions(3);

    const leakyBucket = new LeakyBucket(
      logger,
      leakyBucketConfig,
      async function* () {},
      newEvents$
    );
    const sender = jest.fn();
    leakyBucket.start(sender);
    // eslint-disable-next-line dot-notation
    expect(leakyBucket['sending']).toBe(false);

    newEvents$.next(1);

    // eslint-disable-next-line dot-notation
    expect(leakyBucket['sending']).toBe(true);

    // eslint-disable-next-line dot-notation
    expect(leakyBucket['queue'].length).toBe(0);
    leakyBucket.stop();
  });

  test('sends a full queue', async () => {
    expect.assertions(4);

    let moreData = true;
    const leakyBucket = new LeakyBucket(
      logger,
      leakyBucketConfig,
      async function* () {
        while (moreData) {
          yield generateEventEnvelope();
        }
      },
      newEvents$
    );
    const sender = jest.fn().mockImplementation(async () => {
      moreData = false;
      // eslint-disable-next-line dot-notation
      expect(leakyBucket['sending']).toBe(true);
    });
    // eslint-disable-next-line dot-notation
    expect(leakyBucket['sending']).toBe(false);
    await leakyBucket.sendIfDue(sender);

    expect(sender).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line dot-notation
    expect(leakyBucket['queue'].length).toBe(0);
    leakyBucket.stop();
  });

  test('it does not send anything when the generator has nothing to share', async () => {
    const leakyBucket = new LeakyBucket(
      logger,
      leakyBucketConfig,
      async function* () {},
      newEvents$
    );
    const sender = jest.fn();
    await leakyBucket.sendIfDue(sender);
    expect(sender).not.toHaveBeenCalled();
    // eslint-disable-next-line dot-notation
    expect(leakyBucket['queue'].length).toBe(0);
  });

  test('it does not send anything yet when the queue is not full', async () => {
    const leakyBucket = new LeakyBucket(
      logger,
      leakyBucketConfig,
      async function* () {
        yield generateEventEnvelope();
      },
      newEvents$
    );
    const sender = jest.fn();
    await leakyBucket.sendIfDue(sender);
    expect(sender).not.toHaveBeenCalled();
    // eslint-disable-next-line dot-notation
    expect(leakyBucket['queue'].length).toBe(1);
  });

  test('it sends even 1 element when the last send was too far away', async () => {
    const leakyBucket = new LeakyBucket(
      logger,
      leakyBucketConfig,
      async function* () {
        yield generateEventEnvelope();
      },
      newEvents$
    );
    // eslint-disable-next-line dot-notation
    leakyBucket['lastSend'] = moment().subtract(1, 'h');
    const sender = jest.fn();
    await leakyBucket.sendIfDue(sender);
    expect(sender).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line dot-notation
    expect(leakyBucket['queue'].length).toBe(0);
  });

  test('it does not retrieve anything when sending is already true', async () => {
    const generator = jest.fn();
    const leakyBucket = new LeakyBucket(logger, leakyBucketConfig, generator, newEvents$);
    // eslint-disable-next-line dot-notation
    leakyBucket['sending'] = true;
    const sender = jest.fn();
    await leakyBucket.sendIfDue(sender);
    expect(sender).not.toHaveBeenCalled();
    expect(generator).not.toHaveBeenCalled();
  });

  test('error handling: it should retry and clear after that', async () => {
    const leakyBucket = new LeakyBucket(
      logger,
      leakyBucketConfig,
      async function* () {
        while (true) {
          yield generateEventEnvelope();
        }
      },
      newEvents$
    );
    // eslint-disable-next-line dot-notation
    expect(leakyBucket['sendFailures']).toBe(0);
    // eslint-disable-next-line dot-notation
    expect(leakyBucket['queue'].length).toBe(0);
    const sender = jest.fn().mockRejectedValue(new Error('Something went terribly wrong'));
    await leakyBucket.sendIfDue(sender);
    // eslint-disable-next-line dot-notation
    expect(leakyBucket['sendFailures']).toBe(1);
    // eslint-disable-next-line dot-notation
    expect(leakyBucket['queue'].length).toBe(477);
    await leakyBucket.sendIfDue(sender);
    // eslint-disable-next-line dot-notation
    expect(leakyBucket['sendFailures']).toBe(2);
    // eslint-disable-next-line dot-notation
    expect(leakyBucket['queue'].length).toBe(477);
    await leakyBucket.sendIfDue(sender);
    // eslint-disable-next-line dot-notation
    expect(leakyBucket['sendFailures']).toBe(0);
    // eslint-disable-next-line dot-notation
    expect(leakyBucket['queue'].length).toBe(0);
  });
});
