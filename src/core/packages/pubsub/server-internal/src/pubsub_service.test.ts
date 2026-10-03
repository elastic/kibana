/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mockCoreContext } from '@kbn/core-base-server-mocks';
import { defineTopic } from '@kbn/core-pubsub-server';
import { PubSubService } from './pubsub_service';

describe('PubSubService registration', () => {
  const createService = () => new PubSubService(mockCoreContext.create());

  it('does not register a topic when it is only defined', () => {
    const service = createService();
    const setup = service.setup();
    const topic = defineTopic('orders');

    expect(() => setup.registerTopic(topic)).not.toThrow();
  });

  it('throws when the same topic name is registered twice', () => {
    const setup = createService().setup();
    const topic = defineTopic('orders');

    setup.registerTopic(topic);

    expect(() => setup.registerTopic(defineTopic('orders'))).toThrow(
      'Topic "orders" is already registered.'
    );
  });

  it('throws when a topic is registered after setup', () => {
    const service = createService();
    const setup = service.setup();
    service.start();

    expect(() => setup.registerTopic(defineTopic('orders'))).toThrow(
      'Cannot register topic "orders" outside of setup.'
    );
  });

  it('throws when defineTopic is given an invalid name', () => {
    expect(() => defineTopic('')).toThrow(/invalid/i);
    expect(() => defineTopic('has space')).toThrow(/invalid/i);
  });
});
