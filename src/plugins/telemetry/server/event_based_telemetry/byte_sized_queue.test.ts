/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { loggingSystemMock } from '../../../../core/server/mocks';
import { ByteSizedQueue } from './byte_sized_queue';

describe('ByteSizedQueue', () => {
  const logger = loggingSystemMock.createLogger();

  afterEach(() => {
    logger.debug.mockClear();
  });

  test('it does not fail if reading while empty', () => {
    const queue = new ByteSizedQueue(logger, 1);
    expect(queue.read()).toBeUndefined();
  });
  test('enqueue one item and read it', () => {
    const queue = new ByteSizedQueue(logger, 1);
    const item = { hello: 'world' };
    queue.push(item);
    expect(logger.debug).not.toHaveBeenCalled();
    expect(queue.read()).toStrictEqual(item);
  });
  test('when the queue is full, it should clean-up old entries', () => {
    const queue = new ByteSizedQueue(logger, 1);
    const items = [{ hello: 'world' }, { hello: 'item' }];
    items.forEach((item) => queue.push(item));
    expect(logger.debug).toHaveBeenCalledTimes(1);
    expect(queue.read()).toStrictEqual(items[1]);
  });
});
