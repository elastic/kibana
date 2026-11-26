/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getConnectorEventTopicName,
  type ConnectorEventBusData,
  type ConnectorEventTopicDefinition,
  type ConnectorEventTopicName,
} from './connector_event_topic';
import type { inboundWebhookReceived } from './inbound_webhook';
import { slack2Message } from './slack';

describe('connector event topic types', () => {
  it('prefixes the event id for the bus topic name', () => {
    const topicName: ConnectorEventTopicName<'github.push'> =
      getConnectorEventTopicName('github.push');
    // @ts-expect-error the bus name is the prefixed event id
    const bareEventId: ConnectorEventTopicName<'github.push'> = 'github.push';

    expect(topicName).toBe('connectors.github.push');
    expect(getConnectorEventTopicName(slack2Message.name)).toBe('connectors.slack2.message');
    expect(bareEventId).toBe('github.push');
  });

  it('accepts a topics export and a spec entry as a topic definition', () => {
    const fromTopics: ConnectorEventTopicDefinition<
      (typeof slack2Message)['eventSchema'],
      (typeof slack2Message)['name']
    > = slack2Message;
    const fromSpec: ConnectorEventTopicDefinition<
      (typeof slack2Message)['eventSchema'],
      (typeof slack2Message)['name']
    > = {
      name: slack2Message.name,
      eventSchema: slack2Message.eventSchema,
    };

    expect(fromTopics.name).toBe('slack2.message');
    expect(fromSpec.name).toBe(fromTopics.name);
  });

  it('types the published payload as the spoke fields plus the hub fields', () => {
    const payload: ConnectorEventBusData<(typeof inboundWebhookReceived)['eventSchema']> = {
      body: { eventType: 'order.created' },
      connectorId: 'sales-ingress',
      connectorTypeId: '.inboundWebhook',
      spaceId: 'default',
    };
    const withKey: ConnectorEventBusData<(typeof slack2Message)['eventSchema']> = {
      channel: 'C1',
      messageId: '123.456',
      text: 'hello',
      connectorId: 'sales-ingress',
      connectorTypeId: '.slack2',
      spaceId: 'default',
      correlationKey: 'corr-1',
    };

    type SlackBusData = ConnectorEventBusData<(typeof slack2Message)['eventSchema']>;
    const numericChannel: SlackBusData = {
      // @ts-expect-error channel must be a string
      channel: 123,
      messageId: '123.456',
      connectorId: 'sales-ingress',
      connectorTypeId: '.slack2',
      spaceId: 'default',
    };
    // @ts-expect-error channel is required
    const missingChannel: SlackBusData = {
      messageId: '123.456',
      connectorId: 'sales-ingress',
      connectorTypeId: '.slack2',
      spaceId: 'default',
    };

    expect(payload.connectorId).toBe('sales-ingress');
    expect(withKey.text).toBe('hello');
    expect(withKey.channel).toBe('C1');
    expect(numericChannel.connectorId).toBe('sales-ingress');
    expect(missingChannel.messageId).toBe('123.456');
    expect(withKey.correlationKey).toBe('corr-1');
  });
});
